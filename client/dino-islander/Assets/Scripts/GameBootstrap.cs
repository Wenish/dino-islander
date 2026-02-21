using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using Assets.Scripts.Presentation;
using Colyseus;
using Colyseus.Schema;
using DinoIslander.Infrastructure;
using SchemaTest.FilteredTypes;
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class GameBootstrap : MonoBehaviour
{
    private const float ModifierSwitchCooldownMs = 1_000f;
    private const float HammerHitCooldownMs = 1_000f;
    private const float RaptorSpawnCooldownMs = 10000f;
    private const float LobbyCountdownDurationMs = 5000f;
    private const float GameOverCountdownDurationMs = 20_000f;
    private Color LocalPlayerColor = new Color(0.2823529411764706f, 0.5843137254901961f, 0.6509803921568628f);
    private Color RemotePlayerColor = new Color(0.8705882352941177f, 0.32941176470588235f, 0.32941176470588235f);

    [SerializeField] private UnitSpawner _unitSpawner;
    [SerializeField] private BuildingSpawner _buildingSpawner;
    [SerializeField] private HudSpawner _hudSpawner;
    [SerializeField] private MapView _mapView;
    [SerializeField] private Client _client;
    [SerializeField] private Room<GameRoomState> _room;
    [SerializeField] private Camera _mainCam;
    [SerializeField] private CombatTextManager _combatTextManager;
    [SerializeField] private HammerHitService _hammerHitService;

    [SerializeField] private UIRoot _uiRoot;

    private UnitFactory _unitFactory;
    private EntityTracker _entityTracker;
    private BuildingFactory _buildingFactory;
    private readonly HudFactory _hudFactory = new();
    private Map _map;
    private readonly List<IBuilding> _localCastles = new();
    private PlayerSchema _localPlayer;
    private IHud _hud;
    private float _currentPhaseTimeMs;

    private void Start()
    {
        _entityTracker = new EntityTracker();
        _unitFactory = new UnitFactory();
        _buildingFactory = new BuildingFactory();
        _combatTextManager.Init(_entityTracker);
        _uiRoot.Init(this);

        _map = MapGenerator.Generate(40, 20);
        _mapView.Render(_map);

        _uiRoot.SwitchGameState(GameState.MainMenu);
    }

    public void SetCamPosition(float x, float y)
    {
        _mainCam.transform.position = new Vector3(x, y, _mainCam.transform.position.z);
    }

    /// <summary>
    /// Leave the Colyseus room when application quits (built mode)
    /// </summary>
    private async void OnApplicationQuit()
    {
        await LeaveRoom();
    }

    /// <summary>
    /// Leave the Colyseus room when the GameObject is destroyed (editor stop mode)
    /// </summary>
    private async void OnDestroy()
    {
        await LeaveRoom();
    }

    /// <summary>
    /// Safely leave the Colyseus game room
    /// Handles both editor and built mode
    /// </summary>
    private async Awaitable LeaveRoom()
    {
        if (_room != null)
        {
            try
            {
                await _room.Leave();
                Debug.Log("Successfully left Colyseus room");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"Error leaving room: {ex.Message}");
            }
        }

        CleanupSceneAfterLeave();
    }

    private void CleanupSceneAfterLeave()
    {
        _unitSpawner?.DespawnAll();
        _buildingSpawner?.DespawnAll();

        _entityTracker?.Clear();
        _localCastles.Clear();
        _localPlayer = null;
        _currentPhaseTimeMs = 0f;
        _room = null;
    }

    public async Awaitable LeaveGame()
    {
        await LeaveRoom();
        _uiRoot.SwitchGameState(GameState.MainMenu);
    }

    public async Awaitable<Room<GameRoomState>> ConnectToServer(bool startWithBots, string playerName)
    {
#if UNITY_EDITOR
        _client = new Client("ws://localhost:3011");
#else
        _client = new Client("wss://dino-islander-server.pibern.ch");
#endif
        //_room = await _client.JoinOrCreate<GameRoomState>("game");

        var options = new Dictionary<string, object>
        {
            { "name", playerName },
            { "fillWithBots", startWithBots },
            { "botBehavior", "basic" }
        };

        _room = await _client.JoinOrCreate<GameRoomState>("game", options);

        if (_room == null)
        {
            Debug.LogError("Failed to join room: room is null");
            return null;
        }
        if (_room.State == null)
        {
            Debug.LogError("Failed to get room state: state is null");
            return null;
        }

        _hammerHitService.Init(_room);

        _room.OnStateChange += (state, isFirstState) =>
        {
            if (isFirstState)
            {
                _uiRoot.SwitchGameState(StateUtility.GetStateFromSchema(state.gamePhase));
                _map = MapGenerator.Generate(state.width, state.height);
                SetCamPosition(state.width / 2, state.height / 2);
                _uiRoot.SetTimePastInPhase(state.timePastInThePhase);

                foreach (BuildingSchema building in state.buildings.GetItems())
                {
                    var domainBUilding = _buildingFactory.CreateFromSchema(building, _room.SessionId);
                    _buildingSpawner.SpawnBuilding(domainBUilding);
                }

                for (int i = 0; i < state.players.Count; i++)
                {
                    var player = state.players[i];
                    Debug.Log($"Initializing player {i} with name {player.name} and id {player.id}");
                    SyncPlayerUi(i, player);
                }

                if (state.players.Count < 2)
                {
                    var mockPlayer2 = new PlayerSchema
                    {
                        name = "",
                        id = "",
                        minionsKilled = 0
                    };
                    SyncPlayerUi(1, mockPlayer2);
                }

                RegisterCallbacks();
            }
        };
        return _room;
    }

    private void RegisterCallbacks()
    {
        var callbacks = Callbacks.Get(_room);

        RegisterGameCallbacks(callbacks);
        RegisterPlayerCallbacks(callbacks);
        RegisterTileCallbacks(callbacks);
        RegisterUnitCallbacks(callbacks);
        RegisterBuildingCallbacks(callbacks);
    }

    private void RegisterGameCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.Listen(state => state.gamePhase, (val, prevVal) =>
        {
            var state = StateUtility.GetStateFromSchema(val);
            _uiRoot.SwitchGameState(state); 
        });

        callbacks.Listen(state => state.timePastInThePhase, (value, previousValue) =>
        {
            _currentPhaseTimeMs = value;
            _uiRoot.SetTimePastInPhase(value);
            SyncLocalModifierSwitchProgress();
            SyncLastHammerHitTimeInPhase();
            SyncRaptorSpawnProgress();
        });

        callbacks.Listen(state => state.phaseTimer, (value, previousValue) =>
        {
            if (_room.State.gamePhase == GamePhase.Lobby)
            {
                var secondsLeft = Mathf.CeilToInt((LobbyCountdownDurationMs - value) / 1000f);
                _uiRoot.SetLobbyCountdownTimer(Mathf.Max(0, secondsLeft));
            }
            if (_room.State.gamePhase == GamePhase.GameOver)
            {
                var secondsLeft = Mathf.CeilToInt((GameOverCountdownDurationMs - value) / 1000f);
                _uiRoot.SetGameOverCountdownTimer(Mathf.Max(0, secondsLeft));
            }
        });

        callbacks.Listen(state => state.winnerId, (value, previousValue) =>
        {
            var winnerPlayer = _room.State.players.items.Find(p => p.id == value);
            var winnerName = winnerPlayer != null ? winnerPlayer.name : "Unknown";
            _uiRoot.SetWinnerPlayerName(winnerName);

            var winnerColor = winnerPlayer != null && winnerPlayer.id == _room.SessionId ? LocalPlayerColor : RemotePlayerColor;

            _uiRoot.SetWinnerPlayerNameColor(winnerColor);
        });
    }

    private void RegisterPlayerCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.players, (index, player) =>
        {
            var isLobbyFull = _room.State.players.Count >= 2;

            if (!isLobbyFull)
            {
                _uiRoot.ShowLobbyWaitingForPlayers();
            }

            if (isLobbyFull)
            {
                _uiRoot.ShowLobbyCountdownTimer();
            }

            if (index > 1)
            {
                return;
            }

            SyncPlayerUi(index, player);

            callbacks.Listen(player, p => p.name, (value, previousValue) =>
            {
                Debug.Log($"Player {index} name changed to {value}");
                SyncPlayerName(index, player);
            });

            callbacks.Listen(player, p => p.minionsKilled, (value, previousValue) =>
            {
                Debug.Log($"Player {index} minion kills changed to {value}");
                SyncPlayerMinionKills(index, player);
            });

            callbacks.Listen(player, p => p.id, (value, previousValue) =>
            {
                Debug.Log($"Player {index} id changed to {value}");
                SyncPlayerNameLabelColor(index, player);

                if (player.id == _room.SessionId)
                {
                    _localPlayer = player;
                    SyncLocalModifierSwitchProgress();
                }
            });

            if (player.id == _room.SessionId)
            {
                _localPlayer = player;
                _hud = _hudFactory.CreatePlayerHud();

                void onModifierSwitch() => _ = _room.Send("switchModifier");
                void onRaptorSpawn()
                {
                    if (Mouse.current == null) return;
                    var screenPos = Mouse.current.position.ReadValue();
                    var worldPos = _mainCam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, -_mainCam.transform.position.z));
                    if (_localCastles.Count == 0) return;
                    _ = _room.Send("requestSpawnRaptor", new PlayerActionMessage { actionId = PlayerActionType.SpawnRaptor, x = worldPos.x, y = worldPos.y });
                }

                _hudSpawner.Spawn(_hud, onModifierSwitch, onRaptorSpawn);

                SyncLocalModifierSwitchProgress();
                SyncLastHammerHitTimeInPhase();
                SyncRaptorSpawnProgress();
            }
        });

        callbacks.OnRemove(state => state.players, (index, player) =>
        {
            if (index > 1) return;

            SyncPlayerUi(index, new PlayerSchema { name = "", id = "", minionsKilled = 0 });
            if (player.id == _room.SessionId)
            {
                _localPlayer = null;
                _hudSpawner.Despawn();
                _hud = null;
            }
        });

        callbacks.OnRemove(state => state.players, (index, player) =>
        {
            var isLobbyFull = _room.State.players.Count >= 2;
            if (!isLobbyFull)
            {
                _uiRoot.ShowLobbyWaitingForPlayers();
            }

            if (isLobbyFull)
            {
                _uiRoot.ShowLobbyCountdownTimer();
            }

            if (index > 1)
            {
                return;
            }

            var mockPlayer = new PlayerSchema
            {
                name = "",
                id = "",
                minionsKilled = 0
            };
            SyncPlayerUi(index, mockPlayer);
        });
    }

    private void SyncLastHammerHitTimeInPhase()
    {
        if (_localPlayer == null) return;

        var elapsedSinceSwitchMs = _currentPhaseTimeMs - _localPlayer.lastHammerHitTimeInPhaseMs;
        var progress = Mathf.Clamp01(elapsedSinceSwitchMs / HammerHitCooldownMs);
        
        _hammerHitService.SetChargeProgress(progress);
    }

    private void SyncLocalModifierSwitchProgress()
    {
        if (_localPlayer == null) return;

        var elapsedSinceSwitchMs = _currentPhaseTimeMs - _localPlayer.lastModifierSwitchTimeInPhaseMs;
        var progress = Mathf.Clamp01(elapsedSinceSwitchMs / ModifierSwitchCooldownMs);

        _hud?.SyncModifierSwitchDelayProgress(progress);
    }

    private void SyncRaptorSpawnProgress()
    {
        if (_localPlayer == null) return;

        var elapsed = _currentPhaseTimeMs - _localPlayer.lastRaptorSpawnTimeInPhaseMs;
        var progress = Mathf.Clamp01(elapsed / RaptorSpawnCooldownMs);

        _hud?.SyncRaptorSpawnActionDelayProgress(progress);
    }
                                               
    private void SyncPlayerUi(int index, PlayerSchema player)
    {
        SyncPlayerName(index, player);
        SyncPlayerNameLabelColor(index, player);
        SyncPlayerMinionKills(index, player);
    }

    private void SyncPlayerName(int index, PlayerSchema player)
    {
        var isLocalPlayer = player.id == _room.SessionId;
        var displayName = isLocalPlayer ? $"{player.name} (You)" : player.name;
        _uiRoot.SetPlayerName(index, displayName);
    }

    private void SyncPlayerNameLabelColor(int index, PlayerSchema player)
    {
        var isLocalPlayer = player.id == _room.SessionId;
        var color = isLocalPlayer ? LocalPlayerColor : RemotePlayerColor;
        _uiRoot.SetPlayerNameLabelColor(index, color);
    }

    private void SyncPlayerMinionKills(int index, PlayerSchema player)
    {
        _uiRoot.SetPlayerMinionKills(index, player.minionsKilled);
    }

    private bool IsLocalCastle(IBuilding building)
    {
        return !building.IsHostile && building.Type == Assets.Scripts.Domain.BuildingType.Castle;
    }

    private void RegisterBuildingCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.buildings, (index, building) =>
        {
            var domainBuilding = _buildingFactory.CreateFromSchema(building, _room.SessionId);

            callbacks.Listen(building, b => b.health, (value, previousValue) =>
            {
                if (previousValue <= 0) return;
                var dmg = previousValue - value;
                dmg = Mathf.Clamp(dmg, 0, dmg);

                domainBuilding.DamageTaken(dmg);
                domainBuilding.SyncHealth(building.health);
            });
            callbacks.Listen(building, building => building.maxHealth, (value, previousValue) =>
            {
                domainBuilding.SyncMaxHealth(building.maxHealth);
            });

            if (IsLocalCastle(domainBuilding))
            {
                _localCastles.Add(domainBuilding);
                SyncLocalModifierSwitchProgress();
            }

            _entityTracker.Add(domainBuilding);
            _buildingSpawner.SpawnBuilding(domainBuilding);
        });

        //unit callbacks
        callbacks.OnRemove(state => state.buildings, (index, building) =>
        {
            _localCastles.RemoveAll(castle => castle.Id == building.id);
            _buildingSpawner.Despawn(building.id);
            _entityTracker.Remove(building.id);
        });
    }

    private void RegisterUnitCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.units, (index, unit) =>
        {
            var domainUnit = _unitFactory.CreateFromSchema(unit, _room.SessionId);

            callbacks.Listen(unit, unit => unit.health, (value, previousValue) =>
            {
                if (previousValue <= 0) return;
                var dmg = previousValue - value;
                dmg = Mathf.Clamp(dmg, 0, dmg);

                domainUnit.DamageTaken(dmg);
                domainUnit.SyncHealth(unit.health);
            });
            callbacks.Listen(unit, unit => unit.maxHealth, (value, previousValue) =>
            {
                domainUnit.SyncMaxHealth(unit.maxHealth);
            });
            callbacks.Listen(unit, unit => unit.behaviorState, (value, previousValue) =>
            {
                domainUnit.SyncAnimation(unit.behaviorState);
            });
            callbacks.Listen(unit, unit => unit.y, (value, previousValue) =>
            {
                domainUnit.SyncPosition(domainUnit.Position.Value.x, value);
            });
            callbacks.Listen(unit, unit => unit.x, (value, previousValue) =>
            {
                domainUnit.SyncPosition(value, domainUnit.Position.Value.y);
            });

            callbacks.Listen(unit, unit => unit.modifierId, (value, previousValue) =>
            {
                domainUnit.SyncModifierId(value);
            });

            domainUnit.SyncPosition(unit.x, unit.y);
            domainUnit.SyncModifierId(unit.modifierId);
            domainUnit.SyncAnimation(unit.behaviorState);
            _entityTracker.Add(domainUnit);
            _unitSpawner.SpawnUnit(domainUnit);
        });

        //unit callbacks
        callbacks.OnRemove(state => state.units, (index, unit) =>
        {
            _unitSpawner.DespawnUnit(unit.id);
            _entityTracker.Remove(unit.id);
        });
    }
    private void RegisterTileCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        //tile callbacks
        callbacks.OnAdd(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, MapUtility.GetTypeFromSchema(tile.type));
            _mapView.UpdateTile(_map, tile.x, tile.y);
        });
        callbacks.OnRemove(state => state.tiles, (index, tile) =>
        {
            _map.SetTile(tile.x, tile.y, FloorType.Empty);
            _mapView.UpdateTile(_map, tile.x, tile.y);
        });
    }
}
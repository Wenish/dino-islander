using Assets.Scripts.Application;
using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using Assets.Scripts.Presentation;
using Colyseus;
using Colyseus.Schema;
using DinoIslander.Infrastructure;
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using static Assets.Scripts.Common.TimeHelper;

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
    [SerializeField] private SoundService _soundService;

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
        _hammerHitService?.CleanUp();

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
            _hammerHitService.SetCursorEnabled(state == GameState.InGame);
            _hudSpawner.SetVisible(state == GameState.InGame);
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
            SyncLobbyPlayerSlots();

            if (index > 1)
            {
                return;
            }

            callbacks.Listen(player, p => p.name, (value, previousValue) =>
            {
                if (TryGetUiPlayerIndex(player, out var currentIndex))
                {
                    Debug.Log($"Player {currentIndex} name changed to {value}");
                }
                SyncPlayerUiForCurrentIndex(player);
            });

            callbacks.Listen(player, p => p.minionsKilled, (value, previousValue) =>
            {
                if (TryGetUiPlayerIndex(player, out var currentIndex))
                {
                    Debug.Log($"Player {currentIndex} minion kills changed to {value}");
                }
                SyncPlayerUiForCurrentIndex(player);
            });

            callbacks.Listen(player, p => p.modifierId, (value, previousValue) =>
            {
                if (player.id == _room.SessionId)
                    _hud?.SyncCurrentModifierId(value);
            });

            callbacks.Listen(player, p => p.id, (value, previousValue) =>
            {
                if (TryGetUiPlayerIndex(player, out var currentIndex))
                {
                    Debug.Log($"Player {currentIndex} id changed to {value}");
                }

                SyncPlayerUiForCurrentIndex(player);

                if (player.id == _room.SessionId)
                {
                    _localPlayer = player;
                    SyncLocalModifierSwitchProgress();
                }
            });

            if (player.id == _room.SessionId)
            {
                _localPlayer = player;

                var modifierSwitchProgress = CalcCooldownProgress(_currentPhaseTimeMs, player.lastModifierSwitchTimeInPhaseMs, ModifierSwitchCooldownMs);
                var raptorSpawnProgress = CalcCooldownProgress(_currentPhaseTimeMs, player.lastRaptorSpawnTimeInPhaseMs, RaptorSpawnCooldownMs);
                _hud = _hudFactory.CreatePlayerHud(modifierSwitchProgress, raptorSpawnProgress, player.modifierId);

                _hudSpawner.Spawn(_hud, onModifierSwitch, onRaptorSpawn);
                _hudSpawner.SetVisible(StateUtility.GetStateFromSchema(_room.State.gamePhase) == GameState.InGame);

                callbacks.Listen(player, p => p.lastHammerHitTimeInPhaseMs, (value, previousValue) =>
                {
                    SyncLastHammerHitTimeInPhase();
                });

                SyncLocalModifierSwitchProgress();
                SyncLastHammerHitTimeInPhase();
                SyncRaptorSpawnProgress();
            }

            SyncLobbyPlayerSlots();
        });

        callbacks.OnRemove(state => state.players, (index, player) =>
        {
            if (player.id == _room.SessionId)
            {
                _localPlayer = null;
                _hudSpawner.Despawn();
                _hud = null;
            }

            SyncLobbyPlayerSlots();
        });
    }

    // Callback for when the player clicks the modifier switch button in the HUD
    void onModifierSwitch() => _ = _room.Send("switchModifier");
    void onRaptorSpawn()
    {
        if (Mouse.current == null) return;
        var screenPos = Mouse.current.position.ReadValue();
        var worldPos = _mainCam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, -_mainCam.transform.position.z));
        if (_localCastles.Count == 0) return;
        _ = _room.Send("requestPlayerAction", new PlayerActionMessage { actionId = PlayerActionType.SpawnRaptor, x = worldPos.x, y = worldPos.y });
    }

    private void SyncLastHammerHitTimeInPhase()
    {
        if (_localPlayer == null) return;

        _hammerHitService.SetChargeProgress(CalcCooldownProgress(_currentPhaseTimeMs, _localPlayer.lastHammerHitTimeInPhaseMs, HammerHitCooldownMs));
    }

    private void SyncLocalModifierSwitchProgress()
    {
        if (_localPlayer == null) return;

        _hud?.SyncModifierSwitchDelayProgress(CalcCooldownProgress(_currentPhaseTimeMs, _localPlayer.lastModifierSwitchTimeInPhaseMs, ModifierSwitchCooldownMs));
    }

    private void SyncRaptorSpawnProgress()
    {
        if (_localPlayer == null) return;

        _hud?.SyncRaptorSpawnActionDelayProgress(CalcCooldownProgress(_currentPhaseTimeMs, _localPlayer.lastRaptorSpawnTimeInPhaseMs, RaptorSpawnCooldownMs));
    }
                                               
    private void SyncPlayerUi(int index, PlayerSchema player)
    {
        SyncPlayerName(index, player);
        SyncPlayerNameLabelColor(index, player);
        SyncPlayerMinionKills(index, player);
    }

    private bool TryGetUiPlayerIndex(PlayerSchema player, out int index)
    {
        index = -1;
        if (_room?.State?.players == null || player == null)
        {
            return false;
        }

        var maxUiPlayers = Mathf.Min(2, _room.State.players.Count);
        for (int i = 0; i < maxUiPlayers; i++)
        {
            if (_room.State.players[i] == player)
            {
                index = i;
                return true;
            }
        }

        return false;
    }

    private void SyncPlayerUiForCurrentIndex(PlayerSchema player)
    {
        if (!TryGetUiPlayerIndex(player, out var currentIndex))
        {
            return;
        }

        SyncPlayerUi(currentIndex, player);
    }

    private void SyncLobbyPlayerSlots()
    {
        if (_room?.State?.players == null)
        {
            return;
        }

        var isLobbyFull = _room.State.players.Count >= 2;
        if (!isLobbyFull)
        {
            _uiRoot.ShowLobbyWaitingForPlayers();
        }
        else
        {
            _uiRoot.ShowLobbyCountdownTimer();
        }

        for (int i = 0; i < 2; i++)
        {
            if (i < _room.State.players.Count)
            {
                SyncPlayerUi(i, _room.State.players[i]);
                continue;
            }

            SyncPlayerUi(i, new PlayerSchema
            {
                name = "",
                id = "",
                minionsKilled = 0
            });
        }
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
            Building domainBuilding = _buildingFactory.CreateFromSchema(building, _room.SessionId);

            callbacks.Listen(building, b => b.health, (value, previousValue) =>
            {
                domainBuilding.SyncHealth(building.health);

                if (previousValue <= 0 || value >= previousValue) return;

                var dmg = previousValue - value;
                dmg = Mathf.Max(0, dmg);
                domainBuilding.DamageTaken(dmg);
            });
            callbacks.Listen(building, building => building.maxHealth, (value, previousValue) =>
            {
                domainBuilding.SyncMaxHealth(building.maxHealth);
            });

            callbacks.Listen(building, b => b.playerId, (value, previousValue) =>
            {
                var wasLocalCastle = IsLocalCastle(domainBuilding);

                _buildingSpawner.Despawn(building.id);

                var trackedEntity = _entityTracker.Get(building.id);
                if (trackedEntity != null)
                {
                    _entityTracker.Remove(trackedEntity);
                }

                domainBuilding = _buildingFactory.CreateFromSchema(building, _room.SessionId);
                _entityTracker.Add(domainBuilding);
                _buildingSpawner.SpawnBuilding(domainBuilding);

                var isLocalCastle = IsLocalCastle(domainBuilding);
                _localCastles.RemoveAll(castle => castle.Id == building.id);
                if (isLocalCastle)
                {
                    _localCastles.Add(domainBuilding);
                }

                if (wasLocalCastle != isLocalCastle)
                {
                    SyncLocalModifierSwitchProgress();
                }
            });

            if (IsLocalCastle(domainBuilding))
            {
                _localCastles.RemoveAll(castle => castle.Id == domainBuilding.Id);
                _localCastles.Add(domainBuilding);
                SyncLocalModifierSwitchProgress();
            }

            var existingTracked = _entityTracker.Get(domainBuilding.Id);
            if (existingTracked != null)
            {
                _entityTracker.Remove(existingTracked);
            }

            _entityTracker.Add(domainBuilding);
            _buildingSpawner.SpawnBuilding(domainBuilding);
        });

        //unit callbacks
        callbacks.OnRemove(state => state.buildings, (index, building) =>
        {
            _localCastles.RemoveAll(castle => castle.Id == building.id);
            _buildingSpawner.Despawn(building.id);

            var trackedEntity = _entityTracker.Get(building.id);
            if (trackedEntity != null)
            {
                _entityTracker.Remove(trackedEntity);
            }
        });
    }

    private void RegisterUnitCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.units, (index, unit) =>
        {
            var domainUnit = _unitFactory.CreateFromSchema(unit, _room.SessionId, _soundService);

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
using Assets.Scripts.Domain;
using Assets.Scripts.Domain.Units;
using Assets.Scripts.Presentation;
using Colyseus;
using Colyseus.Schema;
using DinoIslander.Infrastructure;
using System;
using System.Collections.Generic;
using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private UnitSpawner _unitSpawner;
    [SerializeField] private BuildingSpawner _buildingSpawner;
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
    private Map _map;

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
    private void OnApplicationQuit()
    {
        LeaveRoom();
    }

    /// <summary>
    /// Leave the Colyseus room when the GameObject is destroyed (editor stop mode)
    /// </summary>
    private void OnDestroy()
    {
        LeaveRoom();
    }

    /// <summary>
    /// Safely leave the Colyseus game room
    /// Handles both editor and built mode
    /// </summary>
    private async void LeaveRoom()
    {
        if (_room != null)
        {
            try
            {
                await _room.Leave();
                Debug.Log("Successfully left Colyseus room");
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"Error leaving room: {ex.Message}");
            }
        }
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
                    var onModifierSwitch = GetModifierSwitchAction(domainBUilding);
                    _buildingSpawner.SpawnBuilding(domainBUilding, onModifierSwitch);
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
            _uiRoot.SetTimePastInPhase(value);
        });
    }

    private void RegisterPlayerCallbacks(StateCallbackStrategy<GameRoomState> callbacks)
    {
        callbacks.OnAdd(state => state.players, (index, player) =>
        {
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
            });
        });
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
        Color blue = new Color(0.2823529411764706f, 0.5843137254901961f, 0.6509803921568628f);
        Color red = new Color(0.8705882352941177f, 0.32941176470588235f, 0.32941176470588235f);
        var isLocalPlayer = player.id == _room.SessionId;
        var color = isLocalPlayer ? blue : red;
        _uiRoot.SetPlayerNameLabelColor(index, color);
    }

    private void SyncPlayerMinionKills(int index, PlayerSchema player)
    {
        _uiRoot.SetPlayerMinionKills(index, player.minionsKilled);
    }

    private Action GetModifierSwitchAction(IBuilding building)
    {
        if (building.IsHostile || building.Type != Assets.Scripts.Domain.BuildingType.Castle) return null;
        return () => _ = _room.Send("switchModifier");
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
            callbacks.Listen(building, b => b.modifierSwitchDelayProgress, (value, previousValue) =>
            {
                domainBuilding.SyncModifierSwitchDelayProgress(value);
            });

            _entityTracker.Add(domainBuilding);
            var onSwitch = GetModifierSwitchAction(domainBuilding);
            _buildingSpawner.SpawnBuilding(domainBuilding, onSwitch);
        });

        //unit callbacks
        callbacks.OnRemove(state => state.buildings, (index, building) =>
        {
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
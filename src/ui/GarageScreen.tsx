import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getGameData, getUpgradeCost, getVehicleById, getUpgradedStats } from '../data/gameData';
import { VehicleType, UpgradeCategoryKey, VehicleDef } from '../data/types';
import {
  ArrowLeft,
  DollarSign,
  Play,
  Check,
  Car,
  Bike,
} from 'lucide-react';

const LIVERIES = [
  { id: 'moss-green', name: 'Forest Moss', color: '#5BA55B', accent: '#F5EFD9' },
  { id: 'autumn-gold', name: 'Autumn Gold', color: '#F2B544', accent: '#1F3D2B' },
  { id: 'sunset-orange', name: 'Sunset Orange', color: '#E8913A', accent: '#F5EFD9' },
  { id: 'lake-teal', name: 'Lake Teal', color: '#2FB3B0', accent: '#F2B544' },
  { id: 'deep-charcoal', name: 'Deep Carbon', color: '#18181b', accent: '#5BA55B' },
  { id: 'pearl-cream', name: 'Pearl Cream', color: '#F5EFD9', accent: '#E8735A' },
  { id: 'coral-fire', name: 'Coral Fire', color: '#E8735A', accent: '#18181b' },
  { id: 'royal-blue', name: 'Alpine Sky', color: '#8CCBEA', accent: '#1F3D2B' },
];

const WHEEL_STYLES = [
  { id: 'stock', name: 'Factory Stock' },
  { id: 'sport', name: 'Sport 5-Spoke' },
  { id: 'rugged', name: 'Offroad Steelie' },
  { id: 'aero', name: 'Aero Disc' },
];

export const GarageScreen: React.FC = () => {
  const store = useGameStore();
  const gameData = getGameData();
  const vehicles = gameData.vehiclesData.vehicles;

  const [activeTab, setActiveTab] = useState<'vehicles' | 'upgrades' | 'custom'>('vehicles');
  const [filterType, setFilterType] = useState<'all' | VehicleType>('all');

  const selectedVehicle = getVehicleById(store.selectedVehicleId);
  const isOwned = store.ownedVehicles.includes(selectedVehicle.id);
  const upgrades = store.getVehicleUpgrades(selectedVehicle.id);
  const customisation = store.getVehicleCustomisation(selectedVehicle.id);
  const liveStats = getUpgradedStats(selectedVehicle, upgrades);

  const filteredVehicles = vehicles.filter((v: VehicleDef) => {
    if (filterType === 'all') return true;
    return v.type === filterType;
  });

  const handleBuy = (id: string) => {
    store.buyVehicle(id);
  };

  const handleUpgrade = (cat: UpgradeCategoryKey) => {
    store.upgradeVehicle(selectedVehicle.id, cat);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <button
          onClick={() => store.setScreen('menu')}
          className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Main Menu
        </button>

        {/* Currency Display */}
        <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-black text-emerald-300 font-mono">
            ${store.cash.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right Floating Tuning & Stats Panel */}
      <div className="pointer-events-auto self-end max-w-sm w-full bg-zinc-950/90 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 my-auto overflow-y-auto max-h-[85vh]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'vehicles'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Showroom
          </button>
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'upgrades'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Upgrades
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'custom'
                ? 'bg-emerald-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Paint & Style
          </button>
        </div>

        {/* Vehicle Header Info */}
        <div className="border-b border-white/10 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              {selectedVehicle.name}
            </h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/5">
              {selectedVehicle.type}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {selectedVehicle.description}
          </p>
        </div>

        {/* Tab 1: Showroom / Vehicle Grid */}
        {activeTab === 'vehicles' && (
          <div className="flex flex-col gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  filterType === 'all'
                    ? 'bg-zinc-800 text-white border border-white/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All Rides
              </button>
              <button
                onClick={() => setFilterType('car')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1 transition-all ${
                  filterType === 'car'
                    ? 'bg-zinc-800 text-white border border-white/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                Cars
              </button>
              <button
                onClick={() => setFilterType('bike')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1 transition-all ${
                  filterType === 'bike'
                    ? 'bg-zinc-800 text-white border border-white/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                Bikes
              </button>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredVehicles.map((v: VehicleDef) => {
                const owned = store.ownedVehicles.includes(v.id);
                const isSelected = store.selectedVehicleId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => store.selectVehicle(v.id)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400/80 shadow-md'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.defaultColor }} />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {v.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {v.type}
                        </span>
                      </div>
                    </div>

                    <div>
                      {owned ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Owned
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                          ${v.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Buy / Select Button */}
            {!isOwned ? (
              <button
                disabled={store.cash < selectedVehicle.price}
                onClick={() => handleBuy(selectedVehicle.id)}
                className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
              >
                <DollarSign className="w-4 h-4" />
                Purchase for ${selectedVehicle.price.toLocaleString()}
              </button>
            ) : (
              <div className="text-center py-2 text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/40 border border-emerald-500/20 rounded-2xl">
                Ready for Course
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upgrades */}
        {activeTab === 'upgrades' && (
          <div className="flex flex-col gap-3">
            {(['engine', 'tyres', 'nitro', 'chassis'] as UpgradeCategoryKey[]).map((cat) => {
              const currentLvl = upgrades[cat];
              const cost = getUpgradeCost(selectedVehicle, currentLvl);
              const maxLvl = 5;
              const isMax = currentLvl >= maxLvl;

              const catLabels: Record<UpgradeCategoryKey, { title: string; desc: string }> = {
                engine: { title: 'Engine Tuning', desc: 'Top speed & acceleration' },
                tyres: { title: 'Competition Tyres', desc: 'Lateral grip & drift control' },
                nitro: { title: 'Nitro Injection', desc: 'Boost thrust & tank duration' },
                chassis: { title: 'Chassis Weight Loss', desc: 'Lightweight agility & poise' },
              };

              return (
                <div
                  key={cat}
                  className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                        {catLabels[cat].title}
                      </h4>
                      <p className="text-[10px] text-zinc-400">{catLabels[cat].desc}</p>
                    </div>

                    {/* Level Pips */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`w-2 h-2 rounded-full ${
                            lvl <= currentLvl ? 'bg-emerald-400' : 'bg-zinc-800 border border-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-mono text-zinc-400">
                      Level {currentLvl} / {maxLvl}
                    </span>

                    {isMax ? (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        Max Level
                      </span>
                    ) : (
                      <button
                        disabled={store.cash < cost || !isOwned}
                        onClick={() => handleUpgrade(cat)}
                        className="py-1 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-[11px] font-mono shadow transition-all active:scale-95"
                      >
                        Upgrade (${cost.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Customisation (Liveries, Wheels, Plate) */}
        {activeTab === 'custom' && (
          <div className="flex flex-col gap-3">
            {/* Color Palette */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Body Finish
              </label>
              <div className="grid grid-cols-4 gap-2">
                {LIVERIES.map((liv) => (
                  <button
                    key={liv.id}
                    onClick={() =>
                      store.updateCustomisation(selectedVehicle.id, {
                        liveryId: liv.id,
                        color: liv.color,
                        accent: liv.accent,
                      })
                    }
                    className={`h-9 rounded-xl border flex items-center justify-center transition-all ${
                      customisation.color === liv.color
                        ? 'border-white scale-105 shadow-md'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: liv.color }}
                    title={liv.name}
                  >
                    {customisation.color === liv.color && (
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Wheel Styles (for cars) */}
            {selectedVehicle.type === 'car' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Wheel Rim Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WHEEL_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        store.updateCustomisation(selectedVehicle.id, {
                          wheelStyle: style.id,
                        })
                      }
                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold text-left transition-all ${
                        customisation.wheelStyle === style.id
                          ? 'bg-zinc-800 border-emerald-400 text-emerald-300'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Number Plate Text */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                License Plate
              </label>
              <input
                type="text"
                maxLength={8}
                value={customisation.plateText}
                onChange={(e) =>
                  store.updateCustomisation(selectedVehicle.id, {
                    plateText: e.target.value.toUpperCase(),
                  })
                }
                placeholder="RUSH"
                className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        {/* Live Performance Stats Gauge Bars */}
        <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5 text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
            Performance Metrics
          </span>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Top Speed</span>
            <span className="text-white font-mono font-bold">{Math.round(liveStats.speed)} km/h</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${Math.min(100, (liveStats.speed / 240) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-zinc-400">Handling</span>
            <span className="text-white font-mono font-bold">{Math.round(liveStats.handling)}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{ width: `${Math.min(100, (liveStats.handling / 100) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-zinc-400">Nitro Boost</span>
            <span className="text-white font-mono font-bold">{Math.round(liveStats.nitro)}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${Math.min(100, (liveStats.nitro / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Race Now Action */}
        <button
          onClick={() => {
            store.startRace({
              mode: 'quick-race',
              trackId: 'emerald-valley',
              laps: 3,
              rivalsCount: 7,
            });
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(91,165,91,0.3)] transition-all active:scale-98 mt-1"
        >
          <Play className="w-4 h-4 fill-current" />
          Test Drive on Course
        </button>
      </div>
    </div>
  );
};

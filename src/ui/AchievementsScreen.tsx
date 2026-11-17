import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { getGameData } from '../data/gameData';
import { audioManager } from '../audio/audioManager';
import {
  ArrowLeft,
  Award,
  DollarSign,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react';

export const AchievementsScreen: React.FC = () => {
  const store = useGameStore();
  const gameData = getGameData();
  const achievements = gameData.achievements.achievements;

  const handleClaim = (achId: string, rewardCash: number) => {
    if (store.unlockedAchievements.includes(achId)) return;
    store.unlockedAchievements.push(achId);
    store.cash += rewardCash;
    audioManager.playOneShot('lap-chime', 0.9, 1.0, 'ui');
    store.addToast({
      title: 'Achievement Reward Claimed!',
      subtitle: `+$${rewardCash.toLocaleString()} added to your account`,
      icon: 'dollar',
      rewardCash,
    });
    // Trigger store update
    store.selectVehicle(store.selectedVehicleId);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <button
          onClick={() => store.setScreen('menu')}
          className="bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Main Menu
        </button>

        <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-black text-emerald-300 font-mono">
            ${store.cash.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-auto max-w-4xl w-full self-center pointer-events-auto flex flex-col gap-5 py-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            Hall of Milestones
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Achievements
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Track driving feats, zen mastery, and high-speed records. Cash rewards are unlocked on completion.
          </p>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {achievements.map((ach) => {
            const statKey = ach.stat as keyof typeof store.stats;
            const currentVal = typeof store.stats[statKey] === 'number' ? (store.stats[statKey] as number) : 0;
            const isCompleted = currentVal >= ach.target;
            const isClaimed = store.unlockedAchievements.includes(ach.id);

            return (
              <div
                key={ach.id}
                className={`bg-zinc-950/80 backdrop-blur-md border rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 transition-all ${
                  isClaimed
                    ? 'border-emerald-500/30 bg-emerald-950/20'
                    : isCompleted
                    ? 'border-amber-400/50 bg-amber-950/20 shadow-[0_0_15px_rgba(242,181,68,0.15)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isClaimed
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : isCompleted
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-zinc-900 border-white/10 text-zinc-600'
                    }`}
                  >
                    {isClaimed ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : isCompleted ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {ach.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                      {ach.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCompleted ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (currentVal / ach.target) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {Math.min(ach.target, Math.round(currentVal))} / {ach.target}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward Action */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {isClaimed ? (
                    <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Claimed
                    </span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaim(ach.id, ach.reward.cash)}
                      className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs font-mono uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                    >
                      Claim +${ach.reward.cash.toLocaleString()}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-zinc-500 font-mono">
                      +${ach.reward.cash.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-zinc-500 pointer-events-auto">
        Completed achievements auto-save to browser storage.
      </div>
    </div>
  );
};

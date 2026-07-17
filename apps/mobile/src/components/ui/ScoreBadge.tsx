import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '@/constants/theme';

interface ScoreBadgeProps {
  score: number;
  rank?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreTier(score: number) {
  if (score >= 800) return { label: 'Master Curator', color: '#eb9c3e', bg: 'rgba(235, 156, 62, 0.15)' };
  if (score >= 600) return { label: 'Expert', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  if (score >= 400) return { label: 'Curator', color: Colors.primary, bg: 'rgba(235, 156, 62, 0.15)' };
  if (score >= 200) return { label: 'Rising', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
  return { label: 'Newcomer', color: '#71717a', bg: 'rgba(113, 113, 122, 0.15)' };
}

export function ScoreBadge({ score, rank, size = 'sm' }: ScoreBadgeProps) {
  if (!score && score !== 0) return null;

  const tier = getScoreTier(score);
  const isCompact = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tier.bg, borderColor: `${tier.color}33` },
        isCompact && styles.badgeSm,
        isLarge && styles.badgeLg,
      ]}
    >
      <Text
        style={[
          styles.score,
          { color: tier.color },
          isCompact && styles.scoreSm,
          isLarge && styles.scoreLg,
        ]}
      >
        {score}
      </Text>
      {!isCompact && (
        <Text style={[styles.label, { color: tier.color }, isLarge && styles.labelLg]}>
          {tier.label}
        </Text>
      )}
      {rank !== null && rank !== undefined && rank <= 10 && (
        <View
          style={[
            styles.rankBadge,
            {
              backgroundColor:
                rank === 1 ? 'rgba(235, 156, 62, 0.3)' :
                rank <= 3 ? 'rgba(161, 161, 170, 0.2)' :
                'rgba(113, 113, 122, 0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              {
                color:
                  rank === 1 ? '#eb9c3e' :
                  rank <= 3 ? '#d4d4d8' :
                  '#a1a1aa',
              },
            ]}
          >
            #{rank}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  score: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontWeight: '600',
  },
  scoreSm: {
    fontSize: 11,
  },
  scoreLg: {
    fontSize: 16,
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    opacity: 0.8,
  },
  labelLg: {
    fontSize: 12,
  },
  rankBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  rankText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    fontWeight: '700',
  },
});

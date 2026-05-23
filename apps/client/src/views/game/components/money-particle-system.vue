<script setup lang="ts">
import { ref, nextTick, onUnmounted } from "vue";
import MoneyParticle from "./money-particle.vue";

interface ParticleConfig {
  playerId: string;
  amount: number;
  playerX: number;
  playerY: number;
}

interface ParticleInstance {
  id: number;
  props: ParticleProps;
}

interface ParticleProps {
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: "sm" | "md" | "lg" | "xl";
  index: number;
}

const particles = ref<Map<number, ParticleInstance>>(new Map());
const particlePool: ParticleInstance[] = [];
let particleIdCounter = 0;

const POOL_MAX_SIZE = 30;

const getParticleCount = (amount: number): number => {
  const absAmount = Math.abs(amount);
  if (absAmount < 100) return Math.floor(Math.random() * 3) + 3;
  if (absAmount < 500) return Math.floor(Math.random() * 6) + 5;
  if (absAmount < 1000) return Math.floor(Math.random() * 6) + 10;
  return Math.floor(Math.random() * 11) + 15;
};

const getParticleSize = (amount: number): "sm" | "md" | "lg" | "xl" => {
  const absAmount = Math.abs(amount);
  if (absAmount < 100) return "sm";
  if (absAmount < 500) return "md";
  if (absAmount < 1000) return "lg";
  return "xl";
};

const getFlightDuration = (amount: number): number => {
  const absAmount = Math.abs(amount);
  if (absAmount < 100) return 400;
  if (absAmount < 500) return 600;
  if (absAmount < 1000) return 800;
  return 1000;
};

const getScreenEdgePosition = (targetX: number, targetY: number) => {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const edge = Math.floor(Math.random() * 4);

  switch (edge) {
    case 0:
      return { x: Math.random() * screenWidth, y: -50 };
    case 1:
      return { x: screenWidth + 50, y: Math.random() * screenHeight };
    case 2:
      return { x: Math.random() * screenWidth, y: screenHeight + 50 };
    case 3:
      return { x: -50, y: Math.random() * screenHeight };
    default:
      return { x: 0, y: -50 };
  }
};

const getScatterPosition = (centerX: number, centerY: number) => {
  const angle = Math.random() * Math.PI * 2;
  const distance = 100 + Math.random() * 150;
  return {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance,
  };
};

const spawnParticles = async (config: ParticleConfig) => {
  const { playerId, amount, playerX, playerY } = config;

  // 只生成一个粒子，直接在玩家位置生成
  const size = getParticleSize(amount);

  await nextTick();

  const id = ++particleIdCounter;

  const particleProps: ParticleProps = {
    amount,
    startX: playerX,
    startY: playerY,
    endX: playerX,
    endY: playerY,
    size,
    index: 0,
  };

  const particle: ParticleInstance = {
    id,
    props: particleProps,
  };

  particles.value.set(id, particle);
};

const removeParticle = (id: number) => {
  const particle = particles.value.get(id);
  if (particle) {
    particles.value.delete(id);
    if (particlePool.length < POOL_MAX_SIZE) {
      particlePool.push(particle);
    }
  }
};

defineExpose({
  spawnParticles,
  removeParticle,
});

onUnmounted(() => {
  particles.value.clear();
  particlePool.length = 0;
});
</script>

<template>
  <div class="money-particle-system">
    <template v-for="[id, particle] in particles" :key="id">
      <MoneyParticle
        v-bind="particle.props"
        @complete="removeParticle(id)"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.money-particle-system {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: var(--z-ui);
}
</style>

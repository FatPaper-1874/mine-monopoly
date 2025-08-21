<script setup lang='ts'>
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { shuffleArray } from '@/utils'

const SVGLIST = ["bolt", "bomb", "heart", "house", "palette", "sack-dollar", "wand-magic-sparkles"];
function getDoubleSvgList(){
  const _svgList = shuffleArray(SVGLIST)
  return _svgList.concat(_svgList);
}

const isRoll = ref(true);

</script>

<template>
  <div class="background">
    <!-- <button class="rool-button" @click="isRoll = !isRoll">
      <FontAwesomeIcon :icon="isRoll ? 'toilet-paper' : 'toilet-paper-slash'" />
    </button> -->
    <div class="row" :style="{ 'animation-play-state': isRoll ? 'running' : 'paused' }" v-for="i in 8" :key="i">
      <FontAwesomeIcon class="icon" v-for="item in getDoubleSvgList()" :icon="item" />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -10;

  .rool-button {
    $button_size: 3rem;

    position: fixed;
    top: 0;
    right: 0;
    z-index: 100;
    width: $button_size;
    height: $button_size;
    margin: 0.5rem;
    box-shadow: var(--box-shadow);
    border: .25rem solid var(--color-third);
  }

  .row {
    width: 200vw;
    height: 10rem;
    background-color: var(--color-third);
    display: flex;
    justify-content: space-around;
    align-items: center;

    &:nth-child(even) {
      transform: translateX(-100vw);
      -webkit-animation: even_roll 7s linear infinite;
      animation: even_roll 7s linear infinite;
    }

    &:nth-child(odd) {
      transform: translateX(0);
      -webkit-animation: odd_roll 7s linear infinite;
      animation: odd_roll 7s linear infinite;
    }

    @keyframes even_roll {
      0% {
        transform: translateX(-100vw);
      }

      100% {
        transform: translateX(0);
      }
    }

    @keyframes odd_roll {
      0% {
        transform: translateX(0);
      }

      100% {
        transform: translateX(-100vw);
      }
    }
  }

  .icon {
    color: var(--color-second);
    width: 5rem;
    height: 5rem;
  }
}
</style>
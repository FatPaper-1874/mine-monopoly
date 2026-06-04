import { Directive } from "vue";
import gsap from "gsap";

const vPress: Directive<HTMLElement> = {
  mounted(el: HTMLElement) {
    const onDown = () => gsap.to(el, { scale: 0.93, duration: 0.1, ease: "power2.in", willChange: "transform", onComplete: () => { gsap.set(el, { clearProps: "willChange" }); } });
    const onUp = () => gsap.to(el, { scale: 1, duration: 0.25, ease: "elastic.out(1, 0.3)", willChange: "transform", onComplete: () => { gsap.set(el, { clearProps: "willChange" }); } });

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);

    (el as any).__vPressCleanup = () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  },
  unmounted(el: HTMLElement) {
    (el as any).__vPressCleanup?.();
  },
};

export default vPress;

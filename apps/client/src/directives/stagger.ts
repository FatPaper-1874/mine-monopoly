import { Directive } from "vue";
import gsap from "gsap";

const vStagger: Directive<HTMLElement, number> = {
  mounted(el: HTMLElement, binding) {
    const delayMs = binding.value ?? 100;
    const items = el.querySelectorAll(":scope > *");
    const run = () => {
      gsap.fromTo(
        items,
        { scale: 0, y: 10, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, stagger: 0.04, delay: delayMs / 1000, duration: 0.25, ease: "back.out(1.2)" },
      );
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  },
};

export default vStagger;

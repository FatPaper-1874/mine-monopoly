import gsap from "gsap";

export function pageEnter(el: Element, done: () => void) {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out", onComplete: done });
}

export function pageLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: 0.15, ease: "power2.in", onComplete: done });
}

import { Directive } from "vue";
import gsap from "gsap";
import { useAudioManager, SoundName } from "@src/utils/audio";

const vStagger: Directive<HTMLElement, number> = {
	mounted(el: HTMLElement, binding) {
		const delayMs = binding.value ?? 100;
		const items = el.querySelectorAll(":scope > *");
		const audio = useAudioManager();
		const playSound = binding.modifiers?.sound ?? false;

		const run = () => {
			gsap.set(items, { willChange: "transform, opacity" });
			const tl = gsap.timeline({
				onComplete: () => {
					gsap.set(items, { clearProps: "willChange" });
				},
			});
			tl.fromTo(
				items,
				{ scale: 0, y: 10, opacity: 0 },
				{
					scale: 1,
					y: 0,
					opacity: 1,
					stagger: 0.04,
					delay: delayMs / 1000,
					duration: 0.25,
					ease: "back.out(1.2)",
					onStart() {
						if (playSound) {
							audio.playSound(SoundName.BOB);
						}
					},
				},
			);
		};
		requestAnimationFrame(() => requestAnimationFrame(run));
	},
};

export default vStagger;

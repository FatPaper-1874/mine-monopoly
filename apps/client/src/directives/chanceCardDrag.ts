import { FPMessageBox } from "@src/components/utils/fp-message-box";
import { CardUseMode } from "@src/enums/bace";
import { ChanceCardOperateType, ChanceCardType, GameEvents } from "@src/enums/game";
import { ChanceCardInfo } from "@src/interfaces/game";
import { useDeviceStatus, useSettig } from "@src/store";
import { debounce, lightenColor } from "@src/utils";
import useEventBus from "@src/utils/event-bus";
import { App, createApp, createVNode, Directive, DirectiveBinding, DirectiveHook, toRaw, VNode } from "vue";
import ToSelf from "./components/change-card-target-selector/to-self.vue";
import ToProperty from "./components/change-card-target-selector/to-property.vue";
import ToMapitem from "./components/change-card-target-selector/to-mapitem.vue";
import ToOtherPlayer from "./components/change-card-target-selector/to-other-player.vue";
import ToPlayer from "./components/change-card-target-selector/to-player.vue";
import { useMonopolyClient } from "@src/classes/monopoly-client/MonopolyClient";

const eventEmitter = useEventBus();

const CardUseModeMap: Record<CardUseMode, DirectiveHook> = {
	[CardUseMode.Click]: cardUseModeClick,
	[CardUseMode.Drag]: cardUseModeDrag,
};

export const chanceCardSource: Directive = {
	mounted: (...args) => {
		const settingStore = useSettig();
		CardUseModeMap[settingStore.cardUseMode](...args);
	},
};

function cardUseModeClick(el: HTMLElement, binding: DirectiveBinding) {
	const chanceCard = toRaw(binding.value) as ChanceCardInfo;
	el.style.cursor = "pointer";

	el.addEventListener("click", (event: MouseEvent) => {
		let component;
		switch (chanceCard.type) {
			case ChanceCardType.ToMapItem:
				component = ToMapitem;
				break;
			case ChanceCardType.ToOtherPlayer:
				component = ToOtherPlayer;
				break;
			case ChanceCardType.ToPlayer:
				component = ToPlayer;
				break;
			case ChanceCardType.ToProperty:
				component = ToProperty;
				break;
			default:
				component = ToSelf;
				break;
		}

		const fragment = document.createDocumentFragment();
		const targetSelectorApp = createApp(component, {
			chanceCard,
			onUseCard: (targetId: string) => {
				useMonopolyClient().useChanceCard(chanceCard.id, targetId);
				unmount();
			},
			onCancel: unmount,
		}) as App<any>;
		const vm = targetSelectorApp.mount(fragment);
		document.body.appendChild(fragment);

		function unmount() {
			targetSelectorApp.unmount();
			useEventBus().remove(GameEvents.TimeOut, unmount);
		}

		eventEmitter.once(GameEvents.TimeOut, unmount);
	});
}

function cardUseModeDrag(el: HTMLElement, binding: DirectiveBinding) {
	const deviceStatus = useDeviceStatus();
	const chanceCard = toRaw(binding.value) as ChanceCardInfo;

	const svgNamespace = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNamespace, "svg");
	const path = document.createElementNS(svgNamespace, "path");
	const defsElement = document.createElementNS(svgNamespace, "defs");

	const markerElement = document.createElementNS(svgNamespace, "marker");
	markerElement.setAttribute("id", "arrow");
	markerElement.setAttribute("viewBox", "0 0 1024 1024");
	markerElement.setAttribute("width", "10");
	markerElement.setAttribute("height", "10");
	markerElement.setAttribute("refX", "820");
	markerElement.setAttribute("refY", "570");
	markerElement.setAttribute("markerWidth", "3");
	markerElement.setAttribute("markerHeight", "3");
	markerElement.setAttribute("transform", "translate(-60, 0)");
	markerElement.setAttribute("orient", "auto-start-reverse");
	const markerPath = document.createElementNS(svgNamespace, "path");
	markerPath.setAttribute(
		"d",
		"M399.304 0c47.25 0 87.652 41.3 87.652 89.6v199.702c34.096-32.68 99.532-36.692 141.888 12.598 45.658-28.576 106.034-4.294 124.63 32.9C851.756 316.852 896 378.692 896 480c0 5.492-0.406 26.552-0.39 32 0.336 123.942-62.13 153.788-76.63 247.462C815.366 782.808 795.198 800 771.572 800H428.522l-0.002-0.004c-36.732-0.022-71.778-21.214-87.69-56.928C314.842 685.296 242.754 552.244 186.184 528 149.794 512.406 128.016 485.232 128 448c-0.028-68.444 70.196-115.504 133.816-88.238 16.718 7.166 33.34 16.624 49.836 28.306V89.6c0-46.9 41.086-89.6 87.652-89.6zM400 832h384c26.51 0 48 21.49 48 48v96c0 26.51-21.49 48-48 48H400c-26.51 0-48-21.49-48-48v-96c0-26.51 21.49-48 48-48z m336 56c-22.092 0-40 17.908-40 40s17.908 40 40 40 40-17.908 40-40-17.908-40-40-40z"
	);
	markerPath.setAttribute("transform", "rotate(90 512 512)");
	markerPath.setAttribute("fill", chanceCard.color);
	markerPath.style.filter = "drop-shadow(1px 1px 5px #00000033)";
	markerElement.appendChild(markerPath);
	defsElement.appendChild(markerElement);

	svg.setAttribute("xmlns", svgNamespace);
	svg.setAttribute("width", window.innerWidth + "");
	svg.setAttribute("height", window.innerHeight + "");
	svg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
	svg.style.position = "fixed";
	svg.style.left = "0";
	svg.style.top = "0";
	svg.style.zIndex = "501";
	svg.style.pointerEvents = "none";
	svg.appendChild(defsElement);

	path.setAttribute("stroke", chanceCard.color);
	path.setAttribute("stroke-width", "15");
	path.setAttribute("fill", "none");
	path.setAttribute("stroke-dasharray", "20 15");
	path.setAttribute("stroke-linejoin", "round");
	path.setAttribute("marker-end", "url(#arrow)");
	path.style.filter = "drop-shadow(1px 1px 5px #00000033)";

	svg.appendChild(path);

	function setPath(startX: number, startY: number, endX: number, endY: number) {
		path.setAttribute("d", `M ${startX} ${startY} ${endX} ${endY}`);
	}

	if (deviceStatus.isMobile) {
		//移动端
		function handleTouchMove(event: TouchEvent) {
			const touch = event.touches[0];
			const boundingRect = el.getBoundingClientRect();

			const startX = boundingRect.left + (boundingRect.right - boundingRect.left) / 2;
			const startY = boundingRect.top + 20;

			const endX = touch.pageX;
			const endY = touch.pageY;

			if (startX && startY && endX && endY) {
				setPath(startX, startY, endX, endY);
			}
		}

		function inital() {
			path.setAttribute("d", "");
			document.body.removeChild(svg);
			document.removeEventListener("touchmove", handleTouchMove);
			document.removeEventListener("touchend", handleTouchEnd);
		}

		function handleTouchEnd(event: TouchEvent) {
			inital();
			const touch = event.changedTouches[0];
			eventEmitter.emit(ChanceCardOperateType.DROG, chanceCard, touch.pageX, touch.pageY);
		}

		el.addEventListener("touchstart", (event: TouchEvent) => {
			document.body.appendChild(svg);
			eventEmitter.emit(ChanceCardOperateType.HOVER, chanceCard);

			document.addEventListener("touchcancel", inital);

			document.addEventListener("touchmove", handleTouchMove);
			document.addEventListener("touchend", handleTouchEnd);
		});
	} else {
		//pc端
		function handleMouseMove(event: MouseEvent) {
			document.body.style.cursor = "none";
			const boundingRect = el.getBoundingClientRect();

			const startX = boundingRect.left + (boundingRect.right - boundingRect.left) / 2;
			const startY = boundingRect.top + 20;

			const endX = event.pageX;
			const endY = event.pageY;

			if (startX && startY && endX && endY) {
				setPath(startX, startY, endX, endY);
			}
		}

		function inital() {
			document.body.style.cursor = "initial";
			path.setAttribute("d", "");
			document.body.removeChild(svg);
			window.removeEventListener("mouseleave", inital);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		}

		function handleMouseUp(event: MouseEvent) {
			inital();
			eventEmitter.emit(ChanceCardOperateType.DROG, chanceCard, event.pageX, event.pageY);
		}

		el.addEventListener("mousedown", (event: MouseEvent) => {
			document.body.appendChild(svg);
			eventEmitter.emit(ChanceCardOperateType.HOVER, chanceCard);

			window.addEventListener("mouseleave", inital);

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		});
	}
}

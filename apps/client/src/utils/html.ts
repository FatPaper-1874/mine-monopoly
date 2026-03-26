import { PropertyInfo, UISchema } from "@mine-monopoly/types";

export function generatePropertySchema(property: PropertyInfo): UISchema {
	const costList: UISchema[] = property.costList.map((cost, index) => ({
		id: `cost-item-${index}`,
		type: "div",
		style: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			fontSize: "1.1rem",
			width: "70%",
			marginBottom: "1rem",
		},
		children: [
			{
				id: `cost-label-${index}`,
				type: "text",
				content: `LV${index} 过路费`,
				style: {
					flex: "1",
					textAlign: "center",
				},
			},
			{
				id: `cost-value-${index}`,
				type: "text",
				content: String(cost),
				style: {
					flex: "1",
					textAlign: "center",
					color: "var(--color-second)",
					textShadow: "var(--text-shadow)",
				},
			},
		],
	}));

	return {
		id: "property-info",
		type: "div",
		style: {
			width: "100%",
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-around",
			alignItems: "center",
		},
		children: [
			{
				id: "property-name",
				type: "div",
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "1.1rem",
					width: "70%",
					marginBottom: "1rem",
				},
				children: [
					{
						id: "name-text",
						type: "text",
						content: property.name,
						style: {
							textAlign: "center",
							fontSize: "1.5rem",
							color: "var(--color-primary)",
							width: "100%",
						},
					},
				],
			},
			{
				id: "building-level",
				type: "div",
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "1.1rem",
					width: "70%",
					marginBottom: "1rem",
				},
				children: [
					{
						id: "level-label",
						type: "text",
						content: "当前建筑等级",
						style: {
							flex: "1",
							textAlign: "center",
						},
					},
					{
						id: "level-value",
						type: "text",
						content: `LV ${property.level}`,
						style: {
							flex: "1",
							textAlign: "center",
							color: "var(--color-second)",
							textShadow: "var(--text-shadow)",
						},
					},
				],
			},
			{
				id: "build-cost",
				type: "div",
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "1.1rem",
					width: "70%",
					marginBottom: "1rem",
				},
				children: [
					{
						id: "build-cost-label",
						type: "text",
						content: "升级费用",
						style: {
							flex: "1",
							textAlign: "center",
						},
					},
					{
						id: "build-cost-value",
						type: "text",
						content: String(property.buildCost),
						style: {
							flex: "1",
							textAlign: "center",
							color: "var(--color-second)",
							textShadow: "var(--text-shadow)",
						},
					},
				],
			},
			{
				id: "sell-cost",
				type: "div",
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "1.1rem",
					width: "70%",
					marginBottom: "1rem",
				},
				children: [
					{
						id: "sell-cost-label",
						type: "text",
						content: "空地价格",
						style: {
							flex: "1",
							textAlign: "center",
						},
					},
					{
						id: "sell-cost-value",
						type: "text",
						content: String(property.sellCost),
						style: {
							flex: "1",
							textAlign: "center",
							color: "var(--color-second)",
							textShadow: "var(--text-shadow)",
						},
					},
				],
			},
			...costList,
		],
	};
}

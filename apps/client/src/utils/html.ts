import { PropertyInfo } from "@mine-monopoly/types";

export function generatePropertyHtml(property: PropertyInfo): string {
	if (!property) return "";

	// --- 样式定义 (将 SCSS 转换为内联样式) ---
	const styles = {
		container: `
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
    `,
		row: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1.1rem;
      width: 70%;
      margin-bottom: 1rem;
    `,
		label: `
      flex: 1;
      text-align: center;
    `,
		data: `
      flex: 1;
      text-align: center;
      color: var(--color-second);
      text-shadow: var(--text-shadow);
    `,
		nameData: `
      text-align: center;
      font-size: 1.5rem;
      color: var(--color-primary);
      width: 100%;
    `,
	};

	// --- 处理循环部分 (过路费列表) ---
	// 如果你需要手动替换数据，这里只生成了结构
	const costListHtml = property.costList
		.map(
			(cost, index) => `
    <div class="cost_item" style="${styles.row}">
      <span class="label" style="${styles.label}">LV${index} 过路费</span>
      <span class="data" style="${styles.data}">${cost}</span>
    </div>
  `,
		)
		.join("");

	// --- 组装最终 HTML ---
	return `
    <div class="property-info" style="${styles.container}">
      <div class="name" style="${styles.row}">
        <span class="data" style="${styles.nameData}">${property.name}</span>
      </div>

      <div class="buildingLevel" style="${styles.row}">
        <span class="label" style="${styles.label}">当前建筑等级</span>
        <span class="data" style="${styles.data}">LV ${property.level}</span>
      </div>

      <div class="buildCost" style="${styles.row}">
        <span class="label" style="${styles.label}">升级费用</span>
        <span class="data" style="${styles.data}">${property.buildCost}</span>
      </div>

      <div class="sellCost" style="${styles.row}">
        <span class="label" style="${styles.label}">空地价格</span>
        <span class="data" style="${styles.data}">${property.sellCost}</span>
      </div>

      ${costListHtml}
    </div>
  `;
}

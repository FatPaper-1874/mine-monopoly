import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToMany,
	ManyToMany,
	ManyToOne,
	JoinTable,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
} from "typeorm";
import { MapItem } from "./mapItem";
import { ChanceCard } from "./chanceCard";
import { Property } from "./property";
import { ItemType } from "./itemTypes";
import { Street } from "./street";
import { Model } from "./model";

@Entity()
export class Map {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@OneToMany(() => MapItem, (mapItem) => mapItem.map, { cascade: true })
	mapItems: MapItem[];

	@OneToMany(() => Property, (property) => property.map, { cascade: true })
	properties: Property[];

	@ManyToMany(() => ChanceCard, (chanceCard) => chanceCard.maps)
	chanceCards: ChanceCard[];

	@ManyToMany(() => ItemType, (itemType) => itemType.map, { cascade: true })
	itemTypes: ItemType[];

	@ManyToOne(() => Model, (model) => model.map_house_lv0, { cascade: true, nullable: true })
	houseModel_lv0: Model;

	@ManyToOne(() => Model, (model) => model.map_house_lv1, { cascade: true, nullable: true })
	houseModel_lv1: Model;

	@ManyToOne(() => Model, (model) => model.map_house_lv2, { cascade: true, nullable: true })
	houseModel_lv2: Model;

	@OneToMany(() => Street, (street) => street.map, { cascade: true })
	streets: Street[];

	@Column({ type: "text", nullable: true })
	background: string;

	@Column({ type: "simple-array", nullable: true })
	indexList: Array<string>;

	@Column({ type: "boolean", default: false })
	inUse: boolean;

	@CreateDateColumn({
		name: "create_time",
		nullable: true,
	})
	createTime: Date;

	@UpdateDateColumn({
		name: "update_time",
		nullable: true,
	})
	updateTime: Date | null;
}

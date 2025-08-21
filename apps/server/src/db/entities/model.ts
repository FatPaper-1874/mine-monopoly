import {
	Entity,
	PrimaryGeneratedColumn,
	OneToMany,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToMany,
	JoinTable,
	ManyToOne,
	OneToOne,
} from "typeorm";
import { ItemType } from "./itemTypes";
import { Map } from "./map";

@Entity()
export class Model {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "varchar", nullable: false })
	fileUrl: string;

	@Column({ type: "varchar", nullable: false })
	fileName: string;

	@OneToMany(() => ItemType, (itemType) => itemType.model, { cascade: true })
	itemType: ItemType;

	@OneToOne(() => Map, (map) => map.houseModel_lv0)
	map_house_lv0: Map;

	@OneToOne(() => Map, (map) => map.houseModel_lv1)
	map_house_lv1: Map;

	@OneToOne(() => Map, (map) => map.houseModel_lv2)
	map_house_lv2: Map;

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

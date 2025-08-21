import { ChanceCardType } from "src/enums/bace";
import { Entity, PrimaryGeneratedColumn, Column, JoinTable, ManyToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Map } from "./map";

@Entity()
export class ChanceCard {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "varchar", nullable: false })
	describe: string;

	@Column({ type: "varchar", nullable: false })
	icon: string;

	@Column({ type: "varchar", nullable: false })
	color: string;

	@Column({ type: "varchar", nullable: false })
	type: ChanceCardType;

	@Column({ type: "text", nullable: false })
	effectCode: string;

	@ManyToMany(() => Map, (map) => map.chanceCards)
	@JoinTable({ name: "map_chance_card" })
	maps: Map[];

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

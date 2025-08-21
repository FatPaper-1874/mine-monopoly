import { Entity, PrimaryGeneratedColumn, Column, JoinTable, ManyToMany, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { MapItem } from "./mapItem";

@Entity()
export class ArrivedEvent {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "varchar", nullable: false })
	describe: string;

	@Column({ type: "varchar", nullable: false })
	iconUrl: string;

	@Column({ type: "text", nullable: false })
	effectCode: string;

	@OneToMany(() => MapItem, (mapItem) => mapItem.arrivedEvent, { cascade: true })
	mapItem: MapItem[];

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

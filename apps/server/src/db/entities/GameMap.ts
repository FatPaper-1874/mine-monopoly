import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, BeforeInsert } from "typeorm";
import { GameMapInDb } from "@mine-monopoly/types";

@Entity()
export class GameMap implements GameMapInDb {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "varchar", nullable: false })
	author: string;

	@Column({ type: "varchar", nullable: false })
	version: string;

	@Column({ type: "text", nullable: true })
	description: string;

	@Column({ type: "varchar", nullable: false })
	coverUrl: string;

	@Column({ type: "varchar", nullable: false })
	mapUrl: string;

	@Column({ type: "varchar", nullable: false })
	hash: string;

	@Column({ type: "boolean", nullable: false, default: false })
	inuse: boolean;
}

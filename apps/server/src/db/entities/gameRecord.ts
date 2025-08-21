import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class GameRecord {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@PrimaryColumn({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "int", nullable: false })
	duration: number;

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

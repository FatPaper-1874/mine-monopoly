import {
	Entity,
	PrimaryGeneratedColumn,
	PrimaryColumn,
	Column,
	OneToMany,
	ManyToOne,
	Index,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";
import { Property } from "./property";
import { Map } from "./map";

@Entity()
export class Street {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "float", nullable: false })
	increase: number;

	@OneToMany(() => Property, (property) => property.street, { cascade: true })
	properties: Property;

	@ManyToOne(() => Map, (map) => map.streets, { onDelete: "CASCADE", onUpdate: "CASCADE" })
	@Index()
	map: Map;

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

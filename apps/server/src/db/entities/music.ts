import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class Music {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @PrimaryColumn({ type: 'varchar', nullable: false})
    name: string

    @Column({ type: 'varchar', nullable: false})
    url: string

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
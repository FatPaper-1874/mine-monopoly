import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @PrimaryColumn({ type: 'varchar', nullable: false})
  roleName: string

  @Column({ type: 'varchar', nullable: false})
  baseUrl: string

  @Column({ type: 'varchar', nullable: false})
  fileName: string

  @Column({ type: 'varchar', nullable: false})
  color: string

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
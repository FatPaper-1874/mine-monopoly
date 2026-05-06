import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, BeforeInsert, CreateDateColumn, Index } from "typeorm";
import { AppDataSource } from "#src/db/dbConnecter";

let hasAdmin = false;

@Entity()
export class User {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@PrimaryColumn({ type: "varchar", nullable: false })
	useraccount: string;

	@Column({ type: "varchar", nullable: false })
	username: string;

	@Column({ type: "varchar", nullable: false })
	password: string;

	@Column({ type: "varchar", nullable: false })
	salt: string;

	@Column({ type: "varchar", nullable: true })
	avatar: string;

	@Column({ type: "varchar", nullable: false })
	color: string;

	@Column({ type: "boolean", nullable: false, default: false })
	online: boolean;

	@Column({ type: "boolean", nullable: false, default: false })
	isAdmin: boolean;

	@Index()
	@CreateDateColumn({ name: "create_time", nullable: true })
	createTime: Date;

	@Column({ type: "datetime", nullable: true, name: "last_active_time" })
	lastActiveTime: Date | null;

	@BeforeInsert()
	async setAdminStatus() {
		if (hasAdmin) return;
		const userRepository = AppDataSource.getRepository(User);
		const count = await userRepository.count();
		if (count === 0) {
			this.isAdmin = true;
			hasAdmin = true;
		}
	}
}

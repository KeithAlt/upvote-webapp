import { Field, Int, ObjectType } from "type-graphql";
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, BaseEntity, ManyToOne, OneToMany } from "typeorm";
import { Upvote } from "./Upvote";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: "text" })
  title!: string;

  @Field(() => String)
  @Column({ type: "text" })
  text!: string;

  @Field()
  @Column({type: "int", default: 0})
  points!: number;

  @Field(() => Int, { nullable: true })
  voteStatus!: number | null; // 1 or -1 or null

  @Field()
  @Column()
  creatorId!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.posts)
  creator!: User;
  
  @OneToMany(() => Upvote, (upvote) => upvote.post)
  upvotes!: Upvote[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => String)
  @CreateDateColumn()
  updatedAt = new Date();
}
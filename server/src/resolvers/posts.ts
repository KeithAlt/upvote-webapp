import { MyContext } from './../types';
import { User } from "../entities/User";
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { database } from "../database";
import { Post } from "../entities/Post";
import { Upvote } from "../entities/Upvote";
import { isAuth } from "../middleware/isAuth";

@InputType()
class PostInput {
    @Field()
    title!: string
    @Field()
    text!: string
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts!: Post[]
    @Field()
    hasMore!: boolean;
}

@Resolver(Post)
export class PostResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() root: Post) {
        return root.text.slice(0, 50);
    }

    @FieldResolver(() => User)
    creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(
        @Root() post: Post, 
        @Ctx() { upvoteLoader, req }: MyContext
    ) {
        if (!req.session.userId) { 
            return null;
        }

        const upvote = await upvoteLoader.load({
            postId: post.id, 
            userId: req.session.userId 
        });

        return upvote ? upvote.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg('postId', () => Int) postId: number,
        @Arg('value', () => Int) value: number,
        @Ctx() {req}: MyContext
    ) {
        const isUpvote = value !== -1;
        const realValue = isUpvote ? 1 : -1;
        const { userId } = req.session;
        const upvote = await Upvote.findOne({where: {postId, userId}});

        // user has voted on the post before
        if (upvote && upvote.value !== realValue) {
            await database.transaction(async (tm) => {
                await tm.query(`
                    update upvote
                    set value = $1
                    where "postId" = $2 and "userId" = $3
                `, [realValue, postId, userId]);

                await tm.query(`
                    update post
                    set points = points + $1
                    where id = $2
                `, [2 * realValue, postId]);
            });
        } else if (!upvote) {
            await database.transaction(async tm => {
                await tm.query(`
                    insert into upvote ("userId", "postId", value)
                    values ($1, $2, $3)
                `, [userId, postId, realValue]);

                await tm.query(`
                    update post
                    set points = points + $1
                    where id = $2
                `, [realValue, postId]);
            })
            
        }
        return true
    }

    // Get all posts in our database
    @Query(() => PaginatedPosts)
    async posts(
        @Arg('limit', () => Int) limit: number,
        @Arg('cursor', () => String, { nullable: true }) cursor: string | null
    ): Promise<PaginatedPosts> {
        // 20 -> 21 : means is more posts to be shown
        const realLimit = Math.min(50, limit) + 1;
        const realLimitPlusOne = realLimit + 1;
        
        
        const replacements: any[] = [realLimitPlusOne];

        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }

        const posts = await database.query(
            `
            select p.* 
            from post p
            ${cursor ? `where p."createdAt" < $2` : ''}
            order by p."createdAt" DESC
            limit $1
        `, replacements);

        return { 
            posts: posts.slice(0, realLimit), 
            hasMore: posts.length === realLimitPlusOne, 
        };
    }

    // Get a post by ID in our database
    @Query(() => Post, { nullable: true })
    post(@Arg("id", () => Int) id: number): Promise<Post | null> {
        return Post.findOne({ where: {id} });
    }
    
    // Create a post in our database
    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input") input: PostInput,
        @Ctx() { req }: MyContext
        ): Promise<Post> {
        return Post.create({
            ...input,
            creatorId: req.session.userId,
        }).save();
    }

    // Update a post in our database
    @Mutation(() => Post, {nullable: true})
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id", () => Int) id: number,
        @Arg("title") title: string,
        @Arg("text") text: string,
        @Ctx() {req}: MyContext
    ): Promise<Post | null> {
        const result = await database
        .createQueryBuilder()
        .update(Post)
        .set({ text, title })
        .where('id = :id and "creatorId" = :creatorId', {
            id,
            creatorId: req.session.userId,
        })
        .returning("*")
        .execute();

        return result.raw[0];
    }

    // Delete a post in our database by ID
    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg("id", () => Int) id: number, 
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        await Post.delete({ id, creatorId: req.session.userId })
        return true;
    }
}
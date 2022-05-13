import { MyContext } from '../types';
import { Resolver, Arg, Field, Ctx, Mutation, ObjectType, Query, FieldResolver, Root } from "type-graphql";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { UsernamePasswordInput } from '../entities/UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';
import { database } from "../database"

@ObjectType()
class FieldError {
    @Field()
    field!: string
    @Field()
    message!: string
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver(User)
export class UserResolver {
    @FieldResolver(() => String)
    email(@Root() user: User, @Ctx() {req}: MyContext) {
        // Current user == can receive own email
        if (req.session.userId === user.id) {
            return user.email;
        }

        // Not the current user requesting other emails
        return "";
    }

    @Mutation(() => UserResponse)
    // Change a user password
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return { 
                errors: [
                    {
                        field: "newPassword",
                        message: "password length must be greater than 2",
                    },
                ],
            };
        }

        const key = FORGET_PASSWORD_PREFIX + token
        const userId = await redis.get(key);
        if (!userId) {
            return { 
                errors: [
                    {
                        field: "token",
                        message: "token expired",
                    },
                ],
            };
        }

        const userIdNum = parseInt(userId)
        const user = await User.findOne({where: {id: userIdNum}});

        if (!user) {
            return { 
                errors: [
                    {
                        field: "token",
                        message: "user no longer exists",
                    },
                ],
            };
        }

        await User.update({id: userIdNum}, {
            password: await argon2.hash(newPassword),
        });

        // Make the token no longer valid
        await redis.del(key);

        // login user after password change
        req.session.userId = user.id;

        return { user };
    }

    // Forgot password
    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { redis } : MyContext
    ) {
        const user = await User.findOne({where: { email: email }});
        if (!user) {
            // email not in database
            return true;
        }

        const token = v4(); // Generates a random string (for token)

        // Sets our url to expire after X amt of time
        await redis.set(
            FORGET_PASSWORD_PREFIX + token, 
            user.id, 
            "EX", 
            1000 * 60 * 60 * 24 * 3 // 3 Days
        );

        sendEmail(
            email, 
            `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
        );

        return true;
    }

    // Confirm the user is logged in
    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        if (!req.session.userId) {
            return null
        }

        return User.findOne({where: {id: req.session.userId}});
    }

    // Create a new user in our database
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors) {
            return { errors };
        }

        // Create & register new user
        const hashedPassword = await argon2.hash(options.password);
        let user;
        try {
            // Alternatively: User.create({}).save
            const result = await database
            .createQueryBuilder()
            .insert()
            .into(User)
            .values({
                username: options.username,
                email: options.email,
                password: hashedPassword,
            })
            .returning("*")
            .execute();
            user = result.raw[0];
        } catch (err) {
            if (err.detail.includes("already exists")) {
                return  {
                    errors: [
                        {
                        field: "username",
                        message: "username already taken"
                        },
                    ],
                };
            }
        }

        // store user id sess; logs them in
        req.session.userId = user.id
        return { user, };
    }

    // Login an existing user in our database
    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(
            usernameOrEmail.includes('@')
            ? { where: {email: usernameOrEmail} }
            : { where: {username: usernameOrEmail} }
        );
        if (!user) {
            return {
                errors: [
                    {
                    field: 'usernameOrEmail',
                    message: 'no username exists'
                    },
                ],
            };
        }

        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [   
                    {
                        field: "password",
                        message: "incorrect password",
                    },
                ],
            };
        }

        req.session.userId = user.id;

        console.log("Logging in: ", user.username); // DEBUG
        return { user, };
    }

    @Mutation(() => Boolean)
    logout(@Ctx() {req, res}: MyContext) {
        return new Promise(resolve => 
            req.session.destroy((err) => {
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }

                resolve(true)
            })
        );
    }
}
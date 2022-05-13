import { __prod__, __express__, COOKIE_NAME } from "./constants";
import { createUserLoader } from './utils/createUserLoader';
import "reflect-metadata";
import { Post } from "./entities/Post";
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from "type-graphql";
import { PostResolver } from './resolvers/posts';
import { UserResolver } from "./resolvers/user";
import { isArray } from "class-validator";
import Redis from 'ioredis';
import session from 'express-session'; 
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import cors from 'cors';
import { database } from "./database";
import { createUpvoteLoader } from './utils/createUpvoteLoader';

const main = async () => {
    // Init our database connection
    await database.initialize();

    //await Post.delete({}); // DEBUG tool to clear datbase
    //await database.runMigrations(); // DEBUG tool to re-run unran migrations

    // Start our express web server
    const app = express();

    // Redis session middleware
    const RedisStore = require('connect-redis')(session);
    const redis = new Redis();

    app.use(
        cors({
            origin: 'http://localhost:3000',
            credentials: true,
        })
    );

    app.set("trust proxy", true);
    //app.set("Access-Control-Allow-Origin", "http://localhost:3000");
   // app.set("Access-Control-Allow-Credentials", true);

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 1, // 1 year
                httpOnly: true,
                sameSite: 'none', // CSRF
                secure: __prod__, // Only work in https
            },
            saveUninitialized: false,   // Create a session by default
            secret: 'jgifgdhngjdfsklnflgn',
            resave: false,
        })
    );

    // Start our middleware server
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false,
        }),
        plugins: [
            ApolloServerPluginLandingPageGraphQLPlayground(), // Enables legacy graphql playground
        ],
        context: ({ req, res }) => ({ 
            req, 
            res, 
            redis, 
            userLoader: createUserLoader(),
            upvoteLoader: createUpvoteLoader(),
        }),
    });


    await apolloServer.start();
    //const cors = { credentials: true, origin: 'http://localhost:3000' };
    apolloServer.applyMiddleware({ app, cors:false });

    let server = app.listen(__express__.port, () => {
        console.log("Express server started on: \n", server.address());
    });

    const posts = await Post.find({});
    console.log("Response received == ", isArray(posts));
};

main().catch((err) => {
    console.error(err);
});

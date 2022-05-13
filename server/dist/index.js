"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const createUserLoader_1 = require("./utils/createUserLoader");
require("reflect-metadata");
const Post_1 = require("./entities/Post");
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const posts_1 = require("./resolvers/posts");
const user_1 = require("./resolvers/user");
const class_validator_1 = require("class-validator");
const ioredis_1 = __importDefault(require("ioredis"));
const express_session_1 = __importDefault(require("express-session"));
const apollo_server_core_1 = require("apollo-server-core");
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./database");
const createUpvoteLoader_1 = require("./utils/createUpvoteLoader");
const main = async () => {
    await database_1.database.initialize();
    const app = (0, express_1.default)();
    const RedisStore = require('connect-redis')(express_session_1.default);
    const redis = new ioredis_1.default();
    app.use((0, cors_1.default)({
        origin: 'http://localhost:3000',
        credentials: true,
    }));
    app.set("trust proxy", true);
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 1,
            httpOnly: true,
            sameSite: 'none',
            secure: constants_1.__prod__,
        },
        saveUninitialized: false,
        secret: 'jgifgdhngjdfsklnflgn',
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [posts_1.PostResolver, user_1.UserResolver],
            validate: false,
        }),
        plugins: [
            (0, apollo_server_core_1.ApolloServerPluginLandingPageGraphQLPlayground)(),
        ],
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: (0, createUserLoader_1.createUserLoader)(),
            upvoteLoader: (0, createUpvoteLoader_1.createUpvoteLoader)(),
        }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, cors: false });
    let server = app.listen(constants_1.__express__.port, () => {
        console.log("Express server started on: \n", server.address());
    });
    const posts = await Post_1.Post.find({});
    console.log("Response received == ", (0, class_validator_1.isArray)(posts));
};
main().catch((err) => {
    console.error(err);
});

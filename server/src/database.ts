import { DataSource } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import {__prod__ } from "./constants";
import path from "path";
import { Upvote } from "./entities/Upvote";

function createDatabase() {
    if (!__prod__) {
        require("dotenv").config();
    }

    return new DataSource({
        username:  process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        type: process.env.DB_TYPE as any,
        port: (process.env.DB_PORT || process.env.PORT || 3000) as any,
        logging: true,  // <= Custom setting for typeOrm
        synchronize: true,  // <= Custom setting for TypeOrm
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [Post, User, Upvote]
    });
}

// Establish our database
export const database = createDatabase();
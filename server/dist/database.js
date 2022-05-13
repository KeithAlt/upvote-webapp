"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
const typeorm_1 = require("typeorm");
const Post_1 = require("./entities/Post");
const User_1 = require("./entities/User");
const constants_1 = require("./constants");
const path_1 = __importDefault(require("path"));
const Upvote_1 = require("./entities/Upvote");
function createDatabase() {
    if (!constants_1.__prod__) {
        require("dotenv").config();
    }
    return new typeorm_1.DataSource({
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        type: process.env.DB_TYPE,
        port: (process.env.DB_PORT || process.env.PORT || 3000),
        logging: true,
        synchronize: true,
        migrations: [path_1.default.join(__dirname, "./migrations/*")],
        entities: [Post_1.Post, User_1.User, Upvote_1.Upvote]
    });
}
exports.database = createDatabase();

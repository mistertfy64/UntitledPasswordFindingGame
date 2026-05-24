import { describe } from "mocha";
import { TESTING_CONSTANTS } from "../constants";
import mongoose from "mongoose";
import assert from "node:assert";
import { User } from "../../../src/server/models/User";
const bcrypt = require("bcrypt");
import { createWebServer } from "../../../src/server";
const request = require("supertest");
const cheerio = require("cheerio");

describe("/register", ()=>{});

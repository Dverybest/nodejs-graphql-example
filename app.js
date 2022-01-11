const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Event = require("./models/event");
const User = require("./models/user");
const bcrypt = require("bcryptjs");
dotenv.config();

const app = express();

app.use(bodyParser.json());

const user = (userId) => {
  return User.findById(userId.toString())
    .then((user) => {
        console.log('====================================');
        console.log(user._doc.createdEventsu);
        console.log('====================================');
      return {
        ...user._doc,
        createdEvent: null,
      };
    })
    .catch((err) => {
      throw err;
    });
};

const events = (eventIds) => {
    console.log('====================================');
    console.log(eventIds);
    console.log('====================================');
  return Event.findById({ _id: { $in: eventIds } })
    .then((events) => {
        console.log('====================================');
        console.log(events);
        console.log('====================================');
      return events.map((event) => ({
        ...event._doc,
        creator: user.bind(this, event._doc.creator),
      }));
    })
    .catch((err) => {
      throw err;
    });
};
app.use(
  "/graphql",
  graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
            creator:User!
        }

        type User{
            _id: ID!
            email: String!
            password: String
            createdEvents: [Event!]!
        }

        input UserInput{
            email: String!
            password: String!
        }

        input EventInput{
            title: String!
            description: String!
            price: Float!
            date: String
        }

        type RootQuery {
            events: [Event!]!
            users :[String!]!
        }

        type RootMutation {
            createEvent(eventInput:EventInput): Event
            createUser(userInput:UserInput): User
        }

        schema{
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then((result) => {
            return result.map((event) => ({
              ...event._doc,
              creator: user.bind(this, event._doc.creator),
            }));
          })
          .catch((err) => {
            throw err;
          });
      },
      createEvent: ({ eventInput }) => {
        const event = new Event({
          title: eventInput.title,
          description: eventInput.description,
          price: Number(eventInput.price),
          date: new Date().toISOString(),
          creator: "61db73074b8835f2c4cbf297",
        });
        let createdEvent;
        return event
          .save()
          .then((result) => {
            createdEvent = { ...result._doc, _id: result.id };
            return User.findById("61db73074b8835f2c4cbf297");
          })
          .then((user) => {
            if (!user) {
              throw new Error("User not found");
            }
            user.createdEvents.push(event);
            return user.save();
          })
          .then((result) => {
            return createdEvent;
          })
          .catch((err) => {
            throw err;
          });
      },
      createUser: ({ userInput }) => {
        return User.findOne({ email: userInput.email })
          .then((user) => {
            if (user) {
              throw new Error("User exist already.");
            }
            return bcrypt.hash(userInput.password, 12);
          })
          .then((hashedPassword) => {
            const user = new User({
              email: userInput.email,
              password: hashedPassword,
            });
            return user.save();
          })
          .then((user) => {
            return {
              ...user._doc,
              createdEvent: events.bind(this, user._doc.createdEvents),
            };
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:
${process.env.MONGO_PASSWORD}@cluster0.yzhd0.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`);

app.listen(8000);

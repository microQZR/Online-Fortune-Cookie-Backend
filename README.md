# Online Fortune Cookie (backend)

## Description
* This project is the backend part of a fullstack MERN application. It is built with _Express_ and communicates with a _MongoDB_ database using _Mongoose_.

* The complete application (along with the fronted) is a virtual fortune cookie dispenser which rewards the user with virtual fortune cookies for correctly answering trivia questions.

* Trivia questions are fetched from a MongoDB database and user submitted answers are validated using content retrived the same way.

* An all-time top scorers/cookie-earners record list is also stored on a MongoDB database and that list is viewable to all users.

## Live Demo
Try a running demo of the full application [here](https://online-fortune-cookie.netlify.app).

## Installation and deployment
Prerequisites:
* Install _Node.js_ and _npm_.

Deployment:
* Define an environment variable called DB_CONNECTION_STRING with the value of your MongoDB connection string.
* Run `npm start`.

## Attributions
This project makes use of _node.js, npm, express, nodemon, mongoose_ and all their dependencies.

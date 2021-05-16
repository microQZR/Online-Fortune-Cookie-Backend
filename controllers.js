const Trivia = require("./models/trivia");
const TopEarner = require("./models/topEarner");
const httpError = require("./models/httpError");

// Utility function for generating fortune messages
const generateFortuneMessage = () => {
  let chance = Math.random();
  if (chance <= 0.1) return "There was a 10% probability of getting this message. Congratulations, you are indeed very lucky!!";
  if (chance <= 0.15)
    return "There was a 5% probability of getting this message. This is actually quite impressive luck!! Congratulations! Please have nice day.";
  if (chance <= 0.64) return "There was a 49% probability of getting this message. Fairly normal.";
  return `Your lucky numbers are ${Math.floor(Math.random() * 101)}-${Math.floor(Math.random() * 101)}-${Math.floor(
    Math.random() * 101
  )}-${Math.floor(Math.random() * 101)}-${Math.floor(Math.random() * 101)}-${Math.floor(Math.random() * 101)}-${Math.floor(
    Math.random() * 101
  )}-${Math.floor(Math.random() * 101)}.`;
};

// CALLBACK for fetching a random document from the DB
const getTriviaController = async (req, res, next) => {
  let trivia;
  try {
    trivia = (await Trivia.aggregate([{ $sample: { size: 1 } }]))[0];
  } catch (err) {
    return next(new httpError("Failed to retrieve trivia question.", 500));
  }

  res.status(200);
  res.json({
    qid: trivia._id,
    question: trivia.question
  });
};

// CALLBACK for getting list of top cookie earners
const getTopEarnersController = async (req, res, next) => {
  let topEarners;
  try {
    topEarners = await TopEarner.find();
  } catch (err) {
    return next(new httpError('Failed to retrieve list of "top earners"', 500));
  }

  res.status(200);
  res.json(topEarners);
};

// CALLBACK for validating the user's answer and updating the DB
const postTriviaController = async (req, res, next) => {
  // console.log(req.body); //DEBUG

  // Retrieve 'trivia' document by id
  let triviaEntry;
  try {
    triviaEntry = await Trivia.findById(req.body.qid);
  } catch (err) {
    return next(new httpError("Failed verify the user's answer due to internal error", 500));
  }

  // Check if the user supplied answer is correct. If answer is wrong, return response with $isAnswerCorrect === false
  if (String(req.body.answer).toLowerCase() !== triviaEntry.answer) {
    res.status(200);
    res.json({ isAnswerCorrect: false });
    return;
  }

  // Retrieve list of top earners from db
  let topEarners;
  try {
    topEarners = await TopEarner.find();
  } catch (err) {
    return next(new httpError("Failed verify the user's answer due to internal error", 500));
  }

  // Check if current user is already on the 'top earners' list by search with $userName, $userDate and $cookieCount
  let currentTopEarner = topEarners.find(
    element =>
      element.userName === req.body.userName &&
      element.userDate === req.body.userDate &&
      element.cookieCount === req.body.cookiesEarned
  );

  /* (if current user is already on the list)
      => update the document associated with the current user by incrementing its $cookieCount
      => reorder top earners list to determine new top rank
      => return a "correct answer" http response formatted as { isAnswerCorrect: true, cookieContentType: String, value: String | Array, topRank: Number | null }
    */
  if (currentTopEarner) {
    currentTopEarner.cookieCount++;

    topEarners.sort((a, b) => {
      if (a.cookieCount > b.cookieCount) return -1;
      if (a.cookieCount < b.cookieCount) return 1;
      if (a.userDate < b.userDate) return -1;
      if (a.userDate > b.userDate) return 1;
    });

    res.status(200);
    res.json({
      isAnswerCorrect: true,
      cookieContentType: "message",
      value: generateFortuneMessage(),
      topRank: topEarners.indexOf(currentTopEarner) + 1
    });

    new TopEarner(currentTopEarner) //Update the document in the db now
      .save()
      .catch(err => next(new httpError("An error occured while trying to save a document to the database", 500)));

    return;
  }

  // (if current user is not already on the list) Compare request's $cookiesEarned field with the $cookieCount field of the "last ranked" document of the sorted list of "top earners"
  const lastTopEarner = topEarners.reduce((acc, b) => {
    if (acc.cookieCount > b.cookieCount) return b;
    if (acc.cookieCount < b.cookieCount) return acc;
    if (acc.userDate < b.userDate) return b;
    if (acc.userDate > b.userDate) return acc;
    return acc;
  });

  let switchBranch;
  if (req.body.cookiesEarned > lastTopEarner.cookieCount) switchBranch = "A";
  if (req.body.cookiesEarned === lastTopEarner.cookieCount) switchBranch = "B";
  if (req.body.cookiesEarned < lastTopEarner.cookieCount) switchBranch = "C";

  if (switchBranch === "A") {
    return next(new httpError("There seems to be something wrong with your request..", 400));
  }

  if (switchBranch === "B") {
    const newRankedUser = {
      cookieCount: req.body.cookiesEarned + 1,
      userName: req.body.userName,
      userDate: req.body.userDate
    };

    // Replace the the $lastTopEarner in array $topEarners with $newRankedUser, then resort $topEarners (this step is necessary because the new rank of $newRankedUser may be higher than the last rank).
    const IndexOfLastTopEarner = topEarners.indexOf(lastTopEarner);
    topEarners.splice(IndexOfLastTopEarner, 1, newRankedUser);
    topEarners.sort((a, b) => {
      if (a.cookieCount > b.cookieCount) return -1;
      if (a.cookieCount < b.cookieCount) return 1;
      if (a.userDate < b.userDate) return -1;
      if (a.userDate > b.userDate) return 1;
      return -1;
    });

    res.status(200);
    res.json({
      isAnswerCorrect: true,
      cookieContentType: "message",
      value: generateFortuneMessage(),
      topRank: topEarners.indexOf(newRankedUser) + 1
    });

    // Update the entry in the DB
    TopEarner.updateOne(lastTopEarner, newRankedUser).catch(err =>
      next(new httpError("Something went wrong while trying to update a document", 500))
    );

    return;
  }

  if (switchBranch === "C") {
    ++req.body.cookiesEarned;
    if (req.body.cookiesEarned === lastTopEarner.cookieCount && req.body.userDate < lastTopEarner.userDate) {
      const newRankedUser = {
        cookieCount: req.body.cookiesEarned,
        userName: req.body.userName,
        userDate: req.body.userDate
      };

      // Replace the the $lastTopEarner in array $topEarners with $newRankedUser, then resort $topEarners (this step is necessary because the new rank of $newRankedUser may be higher than the last rank).
      const IndexOfLastTopEarner = topEarners.indexOf(lastTopEarner);
      topEarners.splice(IndexOfLastTopEarner, 1, newRankedUser);
      topEarners.sort((a, b) => {
        if (a.cookieCount > b.cookieCount) return -1;
        if (a.cookieCount < b.cookieCount) return 1;
        if (a.userDate < b.userDate) return -1;
        if (a.userDate > b.userDate) return 1;
        return -1;
      });

      res.status(200);
      res.json({
        isAnswerCorrect: true,
        cookieContentType: "message",
        value: generateFortuneMessage(),
        topRank: topEarners.indexOf(newRankedUser) + 1
      });

      // Update the entry in the DB
      TopEarner.updateOne(lastTopEarner, newRankedUser).catch(err =>
        next(new httpError("Something went wrong while trying to update a document", 500))
      );
    } else {
      res.status(200);
      res.json({
        isAnswerCorrect: true,
        cookieContentType: "message",
        value: generateFortuneMessage(),
        topRank: null
      });
    }
  }
};

/* OPERATIONAL DESCRIPTION FOR CALLBACK "getTopEarnersController"
  => Check answer
      => query 'trivia' document by id
      => compare request's answer porperty with document's answer property
  
  (if answer is wrong)
  => return response with $isAnswerCorrect === false
      
  (if answer is correct)
  => Check/update top earners rank
      => get list of top earners from db
      => check if current user is already on the list by search with $uname, $udate and $cookieCount
          (if current user is already on the list)
          => update the document associated with the current user by incrementing its $cookieCount
          => reorder top earners list to determine new top rank
          => return a "correct answer" http response formatted as { isAnswerCorrect: true, cookieContentType: String, value: String | Array, topRank: Number | null }
  
          (if current user is not already on the list)
          => compare request's $cookiesEarned field with the $cookieCount field of the last document of the sorted list of "top earners"
              (if $cookiesEarned > $cookieCount) (case A)
              => return an error http response with message such as "There seems to be something wrong with your request.."
  
              (if $cookiesEarned = $cookieCount) (case B)
              => return a "correct answer http response"
              => insert a new document into the collection, describing the current user
              => delete the document corresponding to the last element of the sorted list of "top earners"
  
          *** (id $cookiesEarned < $cookieCount) (case C)
              => increment $cookiesEarned and compare the request object with last document of the sorted list of "top earners" once more
                  (if $cookiesEarned < $cookieCount)
                  => return a "correct answer http response"
  
                  (if $cookiesEarned = $cookieCount)
                  => compare the request's $userDate field with that of the last document of the sorted list
                      (if $req.userDate < $doc.userDate)
                      => execute (case B) above
  
                      (if $req.userDate >= $doc.userDate)
                      => return a "correct answer http response"
*/

module.exports = {
  getTriviaController,
  getTopEarnersController,
  postTriviaController
};

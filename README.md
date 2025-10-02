# AI_assignment_kk
This will be a repo to record every step i take to complete the assignment.

Phase 1: Decide what task to do
1. I have decided to go with a simple chatbot as i can make it a summarizer too if i want.
2. researched free api keys and decided to use "Groq api" as i was familier with it.
3. start a basic project.

Phase 2: Building
1. copied a simple skeletal code from Groq'sdevloper page to see if the api key is working or not
2. after confirming that api works i converted that skeletal code to a function that inputed a text(question) and gave out an answer
3. ![alt text](image-1.png)

I noticed a few problems:
    1. Inifnite loop no termination clause to stop that chat.
    2. No context retention so every message is treated as new.

The first problem can be solved by a conditional statement
for the second problem i asked chat gpt: "how do you remember context" and it answered
something like i pass the question get an answer then combine them to form a context and then add it to new question and pass
it to the llm to get a new answer, so i tried implementing it.

this is the result: ![alt text](image-2.png), better than before but it still had some problems like if chat got too big it was giving wrong answers.
This was happening due to input being longer than input size of the model hence the input was being truncated resulting in improper answers.

To tackle this i can either use Langchain which was inbulilt context manager or i can build one myself using rag.
i chose rag method as i was more interested in it than just using pre-build modules, if this didn't work i would fall back to langchain.

The rough idea is to use vector embeddings to store chats and combine them with recent k chats to create my own custom context manager.
so the flow will be:
1. user inputs a question. the question is then searched us in the vector database, for this i will be using faiss wrapper by langchain.
2. we fetch top n results and combine then with last k messages so we get a combination of recent context and past context with relevance,
this helps keeping the context managebale and somewhat useful.
3. then we combine all of these with the input question and feed it to llm to get a response.
4. present the answer to the user and store the last question and answer of it to the queue of recent chats and vector storage.

!Potential challenges might be duplicate context selection but we can check for duplicated but it takes extra time.

Commited and pushed progress till now.

Phase 3: Implement custome context.
1. looked up langchain faiss docs to
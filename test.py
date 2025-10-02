import os
from groq import Groq
from dotenv import load_dotenv
import faiss
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain.embeddings import HuggingFaceEmbeddings
load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")    
model_name = "sentence-transformers/all-MiniLM-L6-v2"
hf_embeddings = HuggingFaceEmbeddings(model_name=model_name)

client = Groq(
    api_key=groq_api_key
)
def ask_groq(question):
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": question,
            }
        ],
        model="llama-3.3-70b-versatile",
    )

    return chat_completion.choices[0].message.content


class context:
    def __init__(self, sent):
        self.index = faiss.IndexFlatL2(384)
        self.vector_store = FAISS(
            embedding_function=hf_embeddings,
            index=self.index,
            docstore= InMemoryDocstore(),
            index_to_docstore_id={}
        )


if __name__ == "__main__":
    print("hello i am you personal assistant, how can i help you? ( write end conversation to stop )")

    context = ""
    while True:
        user_input = input("You: ")
        if user_input.lower() == "end conversation":
            print("Assistant: Thank you for using the assistant. Goodbye!")
            break
        context += user_input + "\n"
        response = ask_groq(context)
        context += response + "\n"
        print("Assistant:", response)
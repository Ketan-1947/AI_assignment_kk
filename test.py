import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")    

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
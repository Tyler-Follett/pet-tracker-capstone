import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

server = os.getenv("DB_SERVER")
database = os.getenv("DB_DATABASE")
username = os.getenv("DB_USERNAME")
password = os.getenv("DB_PASSWORD")
driver = os.getenv("DB_DRIVER")

connection_string = (
    f"mssql+pyodbc://{username}:{password}"
    f"@{server}/{database}"
    f"?driver={driver.replace(' ', '+')}"
    "&Encrypt=yes"
    "&TrustServerCertificate=no"
)

engine = create_engine(connection_string)


def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Database connection successful!")
            print(result.scalar())

    except Exception as e:
        print("Database connection failed:")
        print(e)
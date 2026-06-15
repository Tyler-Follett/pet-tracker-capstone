from fastapi import FastAPI
from routes import users, devices, locations

app = FastAPI(title="Pet Tracker API")


@app.get("/")
def root():
    return {"message": "Pet Tracker API Running"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(devices.router)
app.include_router(locations.router)
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import EmailStr
from sqlmodel import Field, Session, SQLModel, create_engine, select


class User(SQLModel, table=True):
    name: str
    email: EmailStr
    api_credits: int
    user_id: str = Field(..., primary_key=True)


class APIKey(SQLModel, table=True):
    api_key: str = Field(..., unique=True, primary_key=True, nullable=False)
    user_id: str


def get_engine():
    engine = create_engine("sqlite:///example.db")
    SQLModel.metadata.create_all(engine)
    return engine


api_key_header = APIKeyHeader(name="Authorization")

user_router = APIRouter(prefix="/user", tags=["Users"])


@user_router.get("/")
def get_user(api_key: str = Security(api_key_header)):
    engine = get_engine()
    with Session(engine) as session:
        api_keys = session.exec(
            select(APIKey).where(APIKey.api_key == api_key),
        ).fetchall()
        if len(api_keys) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API key",
            )
        user_id = api_keys[0].user_id
        user = session.exec(select(User).where(User.user_id == user_id)).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found",
            )
    return user


@user_router.post("/")
def create_user(user: User):
    engine = get_engine()
    with Session(engine) as session:
        session.add(user)
        session.commit()
    return {"message": "User created successfully"}


@user_router.patch("/{user_id}")
def update_user(user_id: str, user_info: User):
    engine = get_engine()
    with Session(engine) as session:
        users = session.exec(select(User).where(User.user_id == user_id)).fetchall()
        if len(users) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid User ID",
            )
        user = users[0]
        user = User(**user_info.model_dump())
        session.add(user)
        session.refresh(user)
    return {"message": "User updated successfully"}

@user_router.delete("/{user_id}")
def delete_user(user_id: str):
    engine = get_engine()
    with Session(engine) as session:
        users = session.exec(select(User).where(User.user_id == user_id)).fetchall()
        if len(users) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid User ID",
            )
        user = users[0]
        session.delete(user)
        api_keys = session.exec(select(APIKey).where(APIKey.user_id == user_id)).fetchall()
        for key in api_keys:
            session.delete(key)
        session.commit()
        session.refresh(user)

    return {"message": "User deleted successfully"}










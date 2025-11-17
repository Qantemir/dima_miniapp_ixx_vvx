from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import get_db
from ..schemas import AddToCartRequest, Cart, RemoveFromCartRequest
from ..utils import serialize_doc

router = APIRouter(tags=["cart"])


async def get_cart_document(db: AsyncIOMotorDatabase, user_id: int):
  cart = await db.carts.find_one({"user_id": user_id})
  if not cart:
    cart = {
      "user_id": user_id,
      "items": [],
      "total_amount": 0,
    }
    result = await db.carts.insert_one(cart)
    cart["_id"] = result.inserted_id
  return cart


def recalculate_total(cart):
  cart["total_amount"] = round(sum(item["price"] * item["quantity"] for item in cart["items"]), 2)
  return cart


@router.get("/cart", response_model=Cart)
async def get_cart(user_id: int = Query(...), db: AsyncIOMotorDatabase = Depends(get_db)):
  cart = await get_cart_document(db, user_id)
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.post("/cart", response_model=Cart)
async def add_to_cart(
  payload: AddToCartRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  product = await db.products.find_one({"_id": payload.product_id})
  if not product:
    raise HTTPException(status_code=404, detail="Товар не найден")

  cart = await get_cart_document(db, payload.user_id)
  existing = next((item for item in cart["items"] if item["product_id"] == payload.product_id), None)
  if existing:
    existing["quantity"] += payload.quantity
  else:
    cart["items"].append(
      {
        "id": uuid4().hex,
        "product_id": payload.product_id,
        "product_name": product["name"],
        "quantity": payload.quantity,
        "price": product["price"],
        "image": product.get("image"),
      }
    )

  cart = recalculate_total(cart)
  await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


@router.delete("/cart/item", response_model=Cart)
async def remove_from_cart(
  payload: RemoveFromCartRequest, db: AsyncIOMotorDatabase = Depends(get_db)
):
  cart = await get_cart_document(db, payload.user_id)
  original_len = len(cart["items"])
  cart["items"] = [item for item in cart["items"] if item["id"] != payload.item_id]
  if len(cart["items"]) == original_len:
    raise HTTPException(status_code=404, detail="Товар не найден в корзине")

  cart = recalculate_total(cart)
  await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
  return Cart(**serialize_doc(cart) | {"id": str(cart["_id"])})


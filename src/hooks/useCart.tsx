import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const draftCart = [...cart];
      const productExists = draftCart.find(
        (product) => product.id === productId
      );

      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stockData.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const desiredAmount = currentAmount + 1;

      if (desiredAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = desiredAmount;
      } else {
        const { data: productData } = await api.get(`/products/${productId}`);
        const newProduct = {
          ...productData,
          amount: 1,
        };
        draftCart.push(newProduct);
      }

      setCart(draftCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(draftCart));
      toast.success('Produto adicionado ao carrinho com sucesso');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const draftCart = [...cart];
      const productExists = draftCart.find(
        (product) => product.id === productId
      );

      if (!productExists) {
        toast.error('O produto não existe');
        return;
      }
      const newCart = draftCart.filter((item) => item.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      toast.success('Produto excluído com sucesso');
    } catch {
      toast.error('Erro na exclusão do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const draftCart = [...cart];
    try {
      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);
      const productExists = draftCart.find(
        (product) => product.id === productId
      );

      if (!productExists) {
        toast.error('O produto não existe');
        return;
      }

      if (amount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else if (amount < 1) {
        toast.error('A quantidade informada é menor que 1');
        return;
      } else {
        const updateCart = draftCart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: amount,
            };
          }
          return product;
        });
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
        toast.success('Produto atualizado com sucesso');
      }
    } catch {
      setCart(draftCart);
      toast.error('Erro na atualização do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

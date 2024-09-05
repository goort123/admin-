import { db } from "@/lib/db";
// import { Product } from "@prisma/client";
import { revalidatePath } from 'next/cache';

// type SelectedProduct = Pick<Product, 'id' | 'name'>; // Example: Selecting 'id' and 'name'

export async function getProducts(search: string, offset: number): Promise<{ products: any[]; newOffset: number | null; totalProducts: number }> {
    // Initialize variables
    let products: string | any[] = [];
    let newOffset = null;
    let totalProducts = 0;
  
    // Search functionality
    if (search) {
      products = await db.product.findMany({
        where: {
          name: {
            contains: search,
          },
        },
        take: 1000, // Limit to 1000 results for searching
      });
      newOffset = null; // No pagination when searching
      totalProducts = products.length; // Total products found matches search criteria
    }
  
    // Pagination functionality
    else if (offset !== null) {
      const pageSize = 5; // Define your page size
  
      // Calculate new offset
      newOffset = offset + pageSize;
  
      // Fetch next set of products
      products = await db.product.findMany({
        skip: offset,
        take: pageSize,
      });
  
      // Count total products
      totalProducts = await db.product.count();
    }
  
    // Return result
    return {
      products,
      newOffset,
      totalProducts,
    };
  }
  export async function deleteProduct(formData: FormData) {
    let id = Number(formData.get('id'));
    console.log(id);
    
    await db.product.delete({
      where: {
        id: id,
      },
    });
  
    console.log(`Deleted product with ID ${id}`);
    revalidatePath('/');
  }
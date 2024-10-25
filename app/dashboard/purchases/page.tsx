import { fetchCustomerBiggestBuy } from '@/app/lib/data';

export default async function Page() {
    const purchases = await fetchCustomerBiggestBuy();
    return (
        <div>
            
        </div>
    );
}
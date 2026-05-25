import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // ─── Metrics ────────────────────────────────────────────────
    const [
      thisMonthRevAgg,
      lastMonthRevAgg,
      thisMonthOrders,
      lastMonthOrders,
      totalOrders,
      totalCustomers,
      thisMonthCustomers,
      lastMonthCustomers,
      totalProducts,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { not: 'cancelled' }, created_at: { gte: startOfThisMonth } },
        _sum: { total_amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { not: 'cancelled' }, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total_amount: true },
      }),
      this.prisma.order.count({ where: { created_at: { gte: startOfThisMonth } } }),
      this.prisma.order.count({ where: { created_at: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: { name: { not: 'admin' } } } }),
      this.prisma.user.count({ where: { role: { name: { not: 'admin' } }, created_at: { gte: startOfThisMonth } } }),
      this.prisma.user.count({ where: { role: { name: { not: 'admin' } }, created_at: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.product.count({ where: { status: 'active' } }),
    ]);

    const thisMonthRevenue = Number(thisMonthRevAgg._sum.total_amount || 0);
    const lastMonthRevenue = Number(lastMonthRevAgg._sum.total_amount || 0);

    const growthPct = (current: number, prev: number) =>
      prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : null;

    // ─── Sales chart (orders from last 12 months) ────────────────
    const chartOrders = await this.prisma.order.findMany({
      where: { status: { not: 'cancelled' }, created_at: { gte: oneYearAgo } },
      select: { created_at: true, total_amount: true },
      orderBy: { created_at: 'asc' },
    });

    // Week: last 7 days
    const weekLabels: string[] = [];
    const weekData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      weekLabels.push(d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }));
      weekData.push(
        chartOrders
          .filter(o => o.created_at >= d && o.created_at < next)
          .reduce((s, o) => s + Number(o.total_amount), 0),
      );
    }

    // Month: last 30 days grouped by week (5 points)
    const monthLabels: string[] = [];
    const monthData: number[] = [];
    for (let i = 4; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      monthLabels.push(
        `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`,
      );
      monthData.push(
        chartOrders
          .filter(o => o.created_at >= start && o.created_at <= end)
          .reduce((s, o) => s + Number(o.total_amount), 0),
      );
    }

    // Year: last 12 months
    const yearLabels: string[] = [];
    const yearData: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      yearLabels.push(mStart.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }));
      yearData.push(
        chartOrders
          .filter(o => o.created_at >= mStart && o.created_at <= mEnd)
          .reduce((s, o) => s + Number(o.total_amount), 0),
      );
    }

    // ─── Top products ────────────────────────────────────────────
    const allItems = await this.prisma.orderItem.findMany({
      where: { order: { status: { not: 'cancelled' } } },
      select: {
        quantity: true,
        total_price: true,
        variant: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                images: { take: 1, orderBy: { sort: 'asc' }, select: { url: true } },
              },
            },
          },
        },
      },
    });

    const productMap = new Map<string, { id: string; name: string; image?: string; totalSales: number; revenue: number }>();
    for (const item of allItems) {
      const p = item.variant.product;
      if (!productMap.has(p.id)) {
        productMap.set(p.id, { id: p.id, name: p.name, image: p.images[0]?.url, totalSales: 0, revenue: 0 });
      }
      const entry = productMap.get(p.id)!;
      entry.totalSales += item.quantity;
      entry.revenue += Number(item.total_price);
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // ─── Recent orders ───────────────────────────────────────────
    const recentOrders = await this.prisma.order.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        created_at: true,
        user: { select: { firstName: true, lastName: true, username: true } },
      },
    });

    // ─── Inventory alerts ────────────────────────────────────────
    const alerts = await this.prisma.productVariant.findMany({
      where: { stock_qty: { lte: 10 } },
      orderBy: { stock_qty: 'asc' },
      take: 5,
      select: {
        id: true,
        sku: true,
        stock_qty: true,
        product: { select: { name: true } },
      },
    });

    return {
      metrics: {
        thisMonthRevenue,
        revenueGrowthPct: growthPct(thisMonthRevenue, lastMonthRevenue),
        thisMonthOrders,
        ordersGrowthPct: growthPct(thisMonthOrders, lastMonthOrders),
        totalOrders,
        totalCustomers,
        thisMonthCustomers,
        customersGrowthPct: growthPct(thisMonthCustomers, lastMonthCustomers),
        totalProducts,
      },
      salesChart: {
        week: { labels: weekLabels, data: weekData },
        month: { labels: monthLabels, data: monthData },
        year: { labels: yearLabels, data: yearData },
      },
      topProducts,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total_amount: Number(o.total_amount),
        created_at: o.created_at.toISOString(),
        customer: o.user
          ? (`${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() || o.user.username)
          : 'Khách',
      })),
      inventoryAlerts: alerts.map(v => ({
        id: v.id,
        productName: v.product.name,
        sku: v.sku,
        stock_qty: v.stock_qty,
        threshold: 10,
      })),
    };
  }
}

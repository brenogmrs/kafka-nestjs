import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Producer } from 'kafkajs';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order)
    private orderModel: typeof Order,
    @Inject('KAFKA_PRODUCER')
    private kafkaProducer: Producer,
  ) {}

  async create(createOrder: CreateOrderDto | any): Promise<Order> {
    const order = await this.orderModel.create(createOrder);

    this.kafkaProducer.send({
      topic: 'payments',
      messages: [
        {
          key: 'payments',
          value: JSON.stringify(order),
        },
      ],
    });

    console.log('criação da order', order);

    return order;
  }

  findAll(): Promise<Order[]> {
    return this.orderModel.findAll();
  }

  findOne(id: string): Promise<Order> {
    return this.orderModel.findByPk(id);
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    return order.update(updateOrderDto);
  }

  async remove(id: string) {
    const order = await this.findOne(id);
    await order.destroy();
  }

  async payment(order: any) {
    await this.kafkaProducer.send({
      topic: 'confirmed_payments',
      messages: [
        {
          key: 'confirmed_payments',
          value: JSON.stringify({
            ...order,
            status: OrderStatus.Approved,
          }),
        },
      ],
    });
  }
}

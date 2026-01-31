import {
  Controller,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from '@prisma/client'; // Fixed import
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user details' })
  getProfile(@Request() req: any) {
    const userRequest = req as unknown as RequestWithUser;
    return userRequest.user;
  }

  // @Post()
  // create(@Body() createUserDto: Prisma.UserCreateInput): Promise<User> {
  //   return this.usersService.create(createUserDto);
  // }

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only ideally)' })
  @ApiResponse({ status: 200, description: 'Return list of users' })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Return user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne({ id });
  }
}

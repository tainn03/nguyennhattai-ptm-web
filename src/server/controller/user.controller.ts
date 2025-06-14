import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepository } from '../repository/user.repository';

const router = Router();
const userRepository = new UserRepository();

const loginSchema = z.object({
email: z.string().email(),
password: z.string().min(6),
});

router.post('/login', async (req: Request, res: Response) => {
try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token });
} catch (error) {
    res.status(400).json({ error: (error as Error).message });
}
});

export default router;
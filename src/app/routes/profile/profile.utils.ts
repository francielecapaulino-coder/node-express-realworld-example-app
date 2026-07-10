import authorMapper, { AuthorWithFollowers } from '../article/author.mapper';
import { Profile } from './profile.model';

const profileMapper = (user: AuthorWithFollowers, id: number | undefined): Profile => authorMapper(user, id);

export default profileMapper;

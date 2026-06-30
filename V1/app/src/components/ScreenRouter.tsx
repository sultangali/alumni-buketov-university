import { useApp } from '../AppContext'
import { Home } from '../screens/Home'
import { Faculties } from '../screens/Faculties'
import { Faculty } from '../screens/Faculty'
import { FacultyAlumni } from '../screens/FacultyAlumni'
import { Profile } from '../screens/Profile'
import { Collection } from '../screens/Collection'
import { Apply } from '../screens/Apply'
import { Access } from '../screens/Access'
import { Moderator } from '../screens/Moderator'
import { Admin } from '../screens/Admin'
import { SubmissionReview } from '../screens/SubmissionReview'

export function ScreenRouter() {
  const { route } = useApp()
  switch (route.name) {
    case 'home':
      return <Home />
    case 'faculties':
      return <Faculties />
    case 'faculty':
      return <Faculty facId={route.fac} />
    case 'facAlumni':
      return <FacultyAlumni facId={route.fac} />
    case 'alumni':
      return <Profile id={route.id} />
    case 'teachers':
      return <Collection kind="teachers" />
    case 'laureates':
      return <Collection kind="laureates" />
    case 'veterans':
      return <Collection kind="veterans" />
    case 'apply':
      return <Apply />
    case 'access':
      return <Access />
    case 'mod':
      return <Moderator />
    case 'submission':
      return <SubmissionReview id={route.id} />
    case 'admin':
      return <Admin />
    default:
      return null
  }
}

import Sidebar from './sidebar'
import Steps from './steps'
import Toolbar from './toolbar'

const CreateWorkspaceMain = () => {
  return (
    <div className="flex flex-col w-screen h-screen bg-workspace-background">
      <Toolbar />
      <div className="flex h-full">
        <Sidebar />
        <div className="flex-1 mr-1 mb-1">
          <Steps />
        </div>
      </div>
    </div>
  )
}

export default CreateWorkspaceMain

import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
const iesrLogo = '/images/iesr-logo-new.png';
import { AnimatedBlobs } from '../components/ui/blobs';


export const LoginPage: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="flex flex-col min-h-screen items-center justify-between bg-background px-4 py-8 sm:px-6 lg:px-8 overflow-hidden relative">

            {/* Header / Logo */}
            <div className="absolute top-2 left-6 z-20">
                <img src={iesrLogo} alt="IESR Logo" className="h-16 sm:h-20 w-auto" />
            </div>

            {/* Central Form & Blobs */}
            <div className="w-full max-w-md mx-auto relative z-10 flex-1 flex flex-col justify-center">
                <AnimatedBlobs />
                <div className="text-center mb-8">
                    <h2
                        className="mt-2 text-center font-bold tracking-tight text-foreground"
                        style={{ fontFamily: 'Calibri', fontSize: '54px' }}
                    >
                        IESR Database
                    </h2>
                </div>
                <div className="flex justify-center mt-2 w-full relative z-10">
                    <Button
                        type="button"
                        onClick={login}
                        className="w-48 justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:shadow-[0_0_35px_rgba(37,99,235,0.9)] transition-all duration-300 ease-in-out transform hover:-translate-y-1 rounded-full px-6 py-5 text-lg"
                        variant="default"
                    >
                        <svg className="mr-3 h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 21 20">
                            <path fillRule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.603.07-.603a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.405 1.77.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clipRule="evenodd" />
                        </svg>
                        Sign in
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-center mb-4">
                <p className="text-center text-sm text-muted-foreground z-10 relative">
                    Accelerating Low Carbon Energy Transition
                </p>
            </div>
        </div>
    );
};

export default LoginPage;

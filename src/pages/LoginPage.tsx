import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import iesrLogo from '../../public/images/iesr-logo-new.png';


export const LoginPage: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="flex min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 absolute top-4 left-4">
                <div>
                    <img src={iesrLogo} alt="IESR Logo" className="h-12 w-24" />
                </div>
            </div>
            <div className="w-full max-w-md mx-auto flex items-center justify-center">
                <div className="w-full">
                    <div className="text-center">
                        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
                            IESR Database
                        </h2>
                    </div>
                    <Card className="w-full">
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <Button
                                    type="button"
                                    onClick={login}
                                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white"
                                    variant="default"
                                >
                                    <svg className="mr-2 h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 21 20">
                                        <path fillRule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.603.07-.603a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.405 1.77.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clipRule="evenodd"/>
                                    </svg>
                                    Sign in
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
